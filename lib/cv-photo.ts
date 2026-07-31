import { generateText, Output } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { z } from "zod"
import { fileURLToPath } from "node:url"

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

// pdfjs needs its worker file at runtime, but the serverless tracer never
// bundles it (pdfjs imports it dynamically) and require.resolve() gets rewritten
// by the bundler into a module id (-> "Invalid workerSrc type"). So the worker
// is vendored into the repo (lib/pdfjs-worker.mjs) and referenced via new URL,
// which webpack emits as an asset and gives us a real file path for.
// NOTE: keep lib/pdfjs-worker.mjs in sync with the installed pdfjs-dist version.
let WORKER_SRC: string | undefined
try {
  WORKER_SRC = fileURLToPath(new URL("./pdfjs-worker.mjs", import.meta.url))
} catch {
  /* falls back to pdfjs' default resolution */
}

/**
 * Applicant-photo extraction from a CV PDF. Two strategies, best-first:
 *
 *   1. PRIMARY — pull the embedded portrait image straight out of the PDF.
 *      A CV photo is almost always a real embedded image object, already
 *      framed by the applicant. Extracting it gives a pixel-perfect result
 *      with no page white, no text and no AI-crop guesswork. We scan every
 *      page (the photo is often NOT on page 1 — many templates start with an
 *      instructions page) and pick the portrait-shaped image, rejecting wide
 *      banners, letterheads and tiny icons.
 *
 *   2. FALLBACK — render a page and ask Gemini for the face box, then crop.
 *      Only used when a PDF has the photo "flattened" into the page (no
 *      separate image object).
 *
 * Every step is guarded: on any failure it returns null and the UI falls back
 * to the initials avatar. Never throws.
 */

// pdfjs (legacy build) expects a few browser globals in Node; @napi-rs/canvas
// provides them. Missing DOMMatrix/Path2D/ImageData is the classic serverless
// "cannot render" cause once a PDF actually contains fonts/vector content.
async function ensurePdfGlobals() {
  const canvas = await import("@napi-rs/canvas")
  const g = globalThis as unknown as Record<string, unknown>
  if (!g.DOMMatrix && canvas.DOMMatrix) g.DOMMatrix = canvas.DOMMatrix
  if (!g.Path2D && canvas.Path2D) g.Path2D = canvas.Path2D
  if (!g.ImageData && canvas.ImageData) g.ImageData = canvas.ImageData
  if (!g.DOMPoint && canvas.DOMPoint) g.DOMPoint = canvas.DOMPoint
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PdfDoc = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PdfPage = any

async function loadPdf(pdf: Buffer): Promise<PdfDoc | null> {
  try {
    await ensurePdfGlobals()
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
    if (WORKER_SRC) pdfjs.GlobalWorkerOptions.workerSrc = WORKER_SRC
    return await pdfjs.getDocument({ data: new Uint8Array(pdf), useSystemFonts: true }).promise
  } catch (err) {
    console.error("[cv-photo] pdf load failed:", err)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIMARY: embedded-image extraction
// ─────────────────────────────────────────────────────────────────────────────

type ImageCandidate = {
  page: number
  name: string
  placedW: number // size on the page in pt (what the reader sees)
  placedH: number
  yTop: number // distance of the image top from the page top, in pt
  area: number
}

// 2×3 affine multiply (PDF convention [a b c d e f]).
function matMul(m: number[], n: number[]): number[] {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ]
}

// Walks a page's operator list, tracking the CTM, and returns every drawn
// image with its on-page size + position. Masks (stencils used for logos/text)
// are intentionally skipped — a photo is a real colour image.
async function collectImageDraws(
  pdfjs: typeof import("pdfjs-dist/legacy/build/pdf.mjs"),
  page: PdfPage,
  pageNum: number,
  pageHeightPt: number,
): Promise<{ name: string; placedW: number; placedH: number; yTop: number }[]> {
  const OPS = pdfjs.OPS
  const opList = await page.getOperatorList()
  const imageOps = new Set<number>([OPS.paintImageXObject, OPS.paintInlineImageXObject])

  let ctm: number[] = [1, 0, 0, 1, 0, 0]
  const stack: number[][] = []
  const out: { name: string; placedW: number; placedH: number; yTop: number }[] = []

  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i]
    const args = opList.argsArray[i]
    if (fn === OPS.save) stack.push(ctm.slice())
    else if (fn === OPS.restore) ctm = stack.pop() || [1, 0, 0, 1, 0, 0]
    else if (fn === OPS.transform) ctm = matMul(ctm, args as number[])
    else if (imageOps.has(fn)) {
      // The image unit square [0,1]² is mapped onto the page by the CTM.
      const placedW = Math.hypot(ctm[0], ctm[1])
      const placedH = Math.hypot(ctm[2], ctm[3])
      // ctm[5] is the y of the square's origin (bottom edge) in PDF space
      // (origin bottom-left). Convert to distance-from-page-top.
      const yTop = pageHeightPt - (ctm[5] + placedH)
      const name = typeof args?.[0] === "string" ? (args[0] as string) : null
      if (name) out.push({ name, placedW, placedH, yTop })
    }
  }
  return out
}

// Resolve a pdfjs image object (populated once the operator list is built).
function getImageObject(page: PdfPage, name: string): Promise<unknown> {
  return new Promise((resolve) => {
    try {
      if (page.objs.has(name)) return resolve(page.objs.get(name))
      page.objs.get(name, resolve)
    } catch {
      resolve(null)
    }
  })
}

// Is this on-page image plausibly an applicant portrait (vs a banner/logo/icon)?
function looksLikePortrait(c: { placedW: number; placedH: number }): boolean {
  const { placedW, placedH } = c
  if (placedW < 35 || placedH < 45) return false // too small → icon/logo
  const aspect = placedW / placedH
  // Portrait to near-square. Rejects wide letterheads/banners (aspect ≫ 1).
  return aspect >= 0.5 && aspect <= 1.15
}

// Rejects flat placeholder/icon/logo images (e.g. a template's grey "insert
// photo here" silhouette). A real headshot — colour OR black-and-white — has
// rich tonal detail and many distinct colours; a placeholder has a handful.
// Measured margins are wide: real photos ~1000+ colours / lumaStd ~60, a
// silhouette ~8 colours / lumaStd ~7.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hasPhotoDetail(cnv: any): boolean {
  try {
    const w = cnv.width, h = cnv.height
    const data = cnv.getContext("2d").getImageData(0, 0, w, h).data
    const n = w * h
    const step = Math.max(1, Math.floor(n / 40000)) // sample for speed
    const buckets = new Set<number>()
    let sum = 0, sum2 = 0, cnt = 0
    for (let i = 0; i < n; i += step) {
      const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2]
      const l = 0.299 * r + 0.587 * g + 0.114 * b
      sum += l
      sum2 += l * l
      cnt++
      buckets.add(((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)) // 5-bit/channel
    }
    if (cnt === 0) return false
    const mean = sum / cnt
    const std = Math.sqrt(Math.max(0, sum2 / cnt - mean * mean))
    return buckets.size >= 24 && std >= 15
  } catch {
    return true // never let a stats error drop an otherwise valid photo
  }
}

// Turns a decoded pdfjs image object into an RGBA canvas at intrinsic size.
async function imageObjectToCanvas(
  obj: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  canvas: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const o = obj as any
  if (!o) return null

  // Newer pdfjs may hand back an ImageBitmap instead of raw bytes.
  if (o.bitmap) {
    const w = o.bitmap.width, h = o.bitmap.height
    if (!w || !h) return null
    const c = canvas.createCanvas(w, h)
    c.getContext("2d").drawImage(o.bitmap, 0, 0)
    return c
  }

  const { data, width: w, height: h, kind } = o
  if (!data || !w || !h) return null

  const c = canvas.createCanvas(w, h)
  const ctx = c.getContext("2d")
  const id = ctx.createImageData(w, h)
  const dst = id.data

  if (kind === 2) {
    // RGB_24BPP, tightly packed.
    for (let i = 0, j = 0; i < w * h; i++) {
      dst[j++] = data[i * 3]
      dst[j++] = data[i * 3 + 1]
      dst[j++] = data[i * 3 + 2]
      dst[j++] = 255
    }
  } else if (kind === 3) {
    // RGBA_32BPP.
    dst.set(data.subarray(0, w * h * 4))
  } else if (kind === 1) {
    // GRAYSCALE_1BPP, rows padded to whole bytes.
    const rowBytes = Math.ceil(w / 8)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const bit = (data[y * rowBytes + (x >> 3)] >> (7 - (x & 7))) & 1
        const v = bit ? 255 : 0
        const p = (y * w + x) * 4
        dst[p] = dst[p + 1] = dst[p + 2] = v
        dst[p + 3] = 255
      }
    }
  } else {
    return null
  }

  ctx.putImageData(id, 0, 0)
  return c
}

/**
 * Finds and extracts the applicant portrait embedded in the PDF. Returns a PNG
 * buffer (native resolution, capped) or null if no portrait-shaped image is
 * present. No AI, no cropping — the applicant's own framing is preserved.
 */
async function extractEmbeddedPortrait(
  pdf: Buffer,
): Promise<{ png: Buffer; page: number; intrinsic: string } | null> {
  const doc = await loadPdf(pdf)
  if (!doc) return null
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
    const canvas = await import("@napi-rs/canvas")

    const MAX_PAGES = 8 // bound the scan
    const numPages = Math.min(doc.numPages, MAX_PAGES)

    // Gather portrait-shaped candidates across pages, largest first.
    const candidates: (ImageCandidate & { page: number })[] = []
    const pageCache = new Map<number, PdfPage>()

    for (let p = 1; p <= numPages; p++) {
      const page = await doc.getPage(p)
      pageCache.set(p, page)
      const pageHeightPt = page.getViewport({ scale: 1 }).height
      const draws = await collectImageDraws(pdfjs, page, p, pageHeightPt)
      for (const d of draws) {
        if (!looksLikePortrait(d)) continue
        candidates.push({
          page: p,
          name: d.name,
          placedW: d.placedW,
          placedH: d.placedH,
          yTop: d.yTop,
          area: d.placedW * d.placedH,
        })
      }
    }

    if (candidates.length === 0) return null

    // Prefer the largest portrait; on a near-tie prefer the one higher up the
    // page (photos usually sit in the header band).
    candidates.sort((a, b) => {
      if (Math.abs(a.area - b.area) / Math.max(a.area, b.area) < 0.15) return a.yTop - b.yTop
      return b.area - a.area
    })

    for (const cand of candidates) {
      const page = pageCache.get(cand.page)!
      const obj = await getImageObject(page, cand.name)
      const src = await imageObjectToCanvas(obj, canvas)
      if (!src) continue

      const iw = src.width, ih = src.height
      if (iw < 60 || ih < 60) continue // intrinsic too small → not a real photo
      if (!hasPhotoDetail(src)) continue // flat placeholder / icon / logo → skip

      // If the image is stretched in the layout, honour the on-page aspect.
      const intrinsicAspect = iw / ih
      const placedAspect = cand.placedW / cand.placedH
      let ow = iw, oh = ih
      if (Math.abs(placedAspect - intrinsicAspect) / intrinsicAspect > 0.08) {
        if (placedAspect >= intrinsicAspect) ow = Math.round(ih * placedAspect)
        else oh = Math.round(iw / placedAspect)
      }
      // Cap the long edge so stored avatars stay small.
      const CAP = 512
      const longEdge = Math.max(ow, oh)
      if (longEdge > CAP) {
        ow = Math.round((ow * CAP) / longEdge)
        oh = Math.round((oh * CAP) / longEdge)
      }

      const out = canvas.createCanvas(ow, oh)
      out.getContext("2d").drawImage(src, 0, 0, iw, ih, 0, 0, ow, oh)
      return { png: out.toBuffer("image/png"), page: cand.page, intrinsic: `${iw}x${ih}` }
    }
    return null
  } catch (err) {
    console.error("[cv-photo] embedded extraction failed:", err)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FALLBACK: render a page + AI face box + crop
// ─────────────────────────────────────────────────────────────────────────────

type Rendered = { png: Buffer; width: number; height: number }
type RenderResult = Rendered | { error: string }

async function renderPdfPage(doc: PdfDoc, pageNum: number, scale = 2): Promise<RenderResult> {
  try {
    const { createCanvas } = await import("@napi-rs/canvas")
    const page = await doc.getPage(pageNum)
    const viewport = page.getViewport({ scale })
    const width = Math.ceil(viewport.width)
    const height = Math.ceil(viewport.height)
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext("2d")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await page.render({ canvasContext: ctx as any, viewport, canvas: canvas as any }).promise
    return { png: canvas.toBuffer("image/png"), width, height }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[cv-photo] pdf render failed:", err)
    return { error: message }
  }
}

type Box = { x: number; y: number; w: number; h: number }

const boxSchema = z.object({
  found: z.boolean().describe("true only if a real person's portrait/headshot photo is present"),
  face_ymin: z.number().describe("head/face top edge, 0-1000"),
  face_xmin: z.number().describe("head/face left edge, 0-1000"),
  face_ymax: z.number().describe("head/face bottom edge (chin), 0-1000"),
  face_xmax: z.number().describe("head/face right edge, 0-1000"),
  photo_ymin: z.number().describe("photo rectangle top edge, 0-1000"),
  photo_xmin: z.number().describe("photo rectangle left edge, 0-1000"),
  photo_ymax: z.number().describe("photo rectangle bottom edge, 0-1000"),
  photo_xmax: z.number().describe("photo rectangle right edge, 0-1000"),
})

function toBox(ymin: number, xmin: number, ymax: number, xmax: number): Box {
  return {
    x: Math.min(xmin, xmax) / 1000,
    y: Math.min(ymin, ymax) / 1000,
    w: Math.abs(xmax - xmin) / 1000,
    h: Math.abs(ymax - ymin) / 1000,
  }
}

async function locatePortrait(png: Buffer): Promise<{ face: Box; photo: Box } | null> {
  try {
    const { output } = await generateText({
      model: google("gemini-2.5-flash"),
      output: Output.object({ schema: boxSchema }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Das ist eine Seite eines Lebenslaufs. Enthält sie ein Bewerbungsfoto einer echten Person, gib ZWEI Bounding Boxes zurück (normalisiert 0-1000): " +
                "'face' = eng um Kopf und Gesicht der Person (von Haaransatz/Kopfoberkante bis Kinn); " +
                "'photo' = die Kanten des rechteckigen Fotos selbst (ohne weißen Seitenhintergrund). " +
                "found=true. Ignoriere Firmenlogos, Icons, Illustrationen und Cliparts. " +
                "Ist kein echtes Personenfoto vorhanden, setze found=false und alle Werte auf 0.",
            },
            { type: "image", image: png },
          ],
        },
      ],
    })
    if (!output || !output.found) return null
    const face = toBox(output.face_ymin, output.face_xmin, output.face_ymax, output.face_xmax)
    let photo = toBox(output.photo_ymin, output.photo_xmin, output.photo_ymax, output.photo_xmax)
    if (photo.w < 0.02 || photo.h < 0.02) photo = { x: 0, y: 0, w: 1, h: 1 }
    return { face, photo }
  } catch (err) {
    console.error("[cv-photo] locate failed:", err)
    return null
  }
}

// Shrinks a rectangle to the tight bounds of its non-white content.
function trimWhiteBorders(
  data: Uint8ClampedArray,
  w: number,
  h: number,
): { x: number; y: number; w: number; h: number } {
  const isWhiteRow = (y: number) => {
    let white = 0
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      if (data[i] > 238 && data[i + 1] > 238 && data[i + 2] > 238) white++
    }
    return white / w > 0.965
  }
  const isWhiteCol = (x: number) => {
    let white = 0
    for (let y = 0; y < h; y++) {
      const i = (y * w + x) * 4
      if (data[i] > 238 && data[i + 1] > 238 && data[i + 2] > 238) white++
    }
    return white / h > 0.965
  }

  let top = 0, bottom = h - 1, left = 0, right = w - 1
  const maxTrim = 0.45
  while (top < h * maxTrim && isWhiteRow(top)) top++
  while (bottom > h * (1 - maxTrim) && isWhiteRow(bottom)) bottom--
  while (left < w * maxTrim && isWhiteCol(left)) left++
  while (right > w * (1 - maxTrim) && isWhiteCol(right)) right--

  if (right - left < 8 || bottom - top < 8) return { x: 0, y: 0, w, h }
  return { x: left, y: top, w: right - left + 1, h: bottom - top + 1 }
}

// Square crop of the applicant photo from a rendered page (fallback path).
async function cropFace(r: Rendered, face: Box, photo: Box): Promise<Buffer | null> {
  try {
    const { createCanvas, loadImage } = await import("@napi-rs/canvas")
    const img = await loadImage(r.png)

    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi))

    let px = Math.max(0, Math.floor(photo.x * r.width))
    let py = Math.max(0, Math.floor(photo.y * r.height))
    let pw = Math.min(Math.ceil(photo.w * r.width), r.width - px)
    let ph = Math.min(Math.ceil(photo.h * r.height), r.height - py)

    const pixelTrim = (x: number, y: number, w: number, h: number) => {
      const scan = createCanvas(w, h)
      const sctx = scan.getContext("2d")
      sctx.drawImage(img, x, y, w, h, 0, 0, w, h)
      const t = trimWhiteBorders(sctx.getImageData(0, 0, w, h).data, w, h)
      return { x: x + t.x, y: y + t.y, w: t.w, h: t.h, rel: t }
    }

    if (pw > 8 && ph > 8) {
      const inflX = Math.round(pw * 0.25)
      const inflY = Math.round(ph * 0.25)
      const ix = Math.max(0, px - inflX)
      const iy = Math.max(0, py - inflY)
      const iw = Math.min(r.width - ix, px + pw + inflX - ix)
      const ih = Math.min(r.height - iy, py + ph + inflY - iy)

      const t = pixelTrim(ix, iy, iw, ih)

      const left = t.rel.x < 2 && ix < px ? px : t.x
      const top = t.rel.y < 2 && iy < py ? py : t.y
      const rightEdge = iw - (t.rel.x + t.rel.w) < 2 && ix + iw > px + pw ? px + pw : t.x + t.w
      const bottomEdge = ih - (t.rel.y + t.rel.h) < 2 && iy + ih > py + ph ? py + ph : t.y + t.h

      if (rightEdge - left > 8 && bottomEdge - top > 8) {
        const clean = pixelTrim(left, top, rightEdge - left, bottomEdge - top)
        if (clean.w > 8 && clean.h > 8) {
          px = clean.x
          py = clean.y
          pw = clean.w
          ph = clean.h
        }
      }
    }

    const fw = face.w * r.width, fh = face.h * r.height
    const fcx = (face.x + face.w / 2) * r.width
    const fcy = (face.y + face.h / 2) * r.height
    const faceUsable = fw > 4 && fh > 4

    const maxSide = Math.max(1, Math.min(pw, ph))

    let side: number, sx: number, sy: number
    if (faceUsable) {
      side = clamp(Math.max(fw, fh) * 2.0, maxSide * 0.55, maxSide * 1.35)
      sx = fcx - side / 2
      sy = fcy - side * 0.46
    } else {
      side = maxSide * 0.985
      sx = px + (pw - side) / 2
      sy = py + (ph - side) * 0.08
    }

    const sampleC = createCanvas(pw, ph)
    const sctx2 = sampleC.getContext("2d")
    sctx2.drawImage(img, px, py, pw, ph, 0, 0, pw, ph)
    const sdata = sctx2.getImageData(0, 0, pw, ph).data
    const at = (fx: number, fy: number) => {
      const x = clamp(Math.round(fx * (pw - 1)), 0, pw - 1)
      const y = clamp(Math.round(fy * (ph - 1)), 0, ph - 1)
      const i = (y * pw + x) * 4
      return [sdata[i], sdata[i + 1], sdata[i + 2]]
    }
    const pts = [at(0.04, 0.03), at(0.5, 0.02), at(0.96, 0.03), at(0.04, 0.22), at(0.96, 0.22)]
    const med = (k: number) => {
      const v = pts.map((p) => p[k]).sort((a, b) => a - b)
      return v[Math.floor(v.length / 2)]
    }
    const bg = [med(0), med(1), med(2)]

    const size = 320
    const out = createCanvas(size, size)
    const octx = out.getContext("2d")
    octx.fillStyle = `rgb(${bg[0]},${bg[1]},${bg[2]})`
    octx.fillRect(0, 0, size, size)

    const ix0 = Math.max(sx, px), iy0 = Math.max(sy, py)
    const ix1 = Math.min(sx + side, px + pw), iy1 = Math.min(sy + side, py + ph)
    if (ix1 > ix0 && iy1 > iy0) {
      const dx = ((ix0 - sx) / side) * size
      const dy = ((iy0 - sy) / side) * size
      const dw = ((ix1 - ix0) / side) * size
      const dh = ((iy1 - iy0) / side) * size
      octx.drawImage(img, ix0, iy0, ix1 - ix0, iy1 - iy0, dx, dy, dw, dh)
    }
    return out.toBuffer("image/png")
  } catch (err) {
    console.error("[cv-photo] crop failed:", err)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export type PhotoDiagnostics = {
  step: "embedded" | "render" | "locate" | "sanity" | "crop" | "ok"
  method?: "embedded" | "ai-crop"
  rendered?: boolean
  pageSize?: string
  page?: number
  found?: boolean
  box?: Box | null
  reason?: string
}

// How many pages the AI fallback will scan for a face before giving up.
const FALLBACK_MAX_PAGES = 3

/** Full pipeline with per-step diagnostics (used by the retry endpoint). */
export async function extractCandidatePhotoDetailed(
  pdf: Buffer,
): Promise<{ photo: Buffer | null; diag: PhotoDiagnostics }> {
  // 1) Primary: embedded portrait, pixel-perfect, no AI.
  const embedded = await extractEmbeddedPortrait(pdf)
  if (embedded) {
    return {
      photo: embedded.png,
      diag: { step: "ok", method: "embedded", found: true, page: embedded.page, pageSize: embedded.intrinsic },
    }
  }

  // 2) Fallback: render + AI face box + crop, scanning the first few pages.
  const doc = await loadPdf(pdf)
  if (!doc) {
    return { photo: null, diag: { step: "render", method: "ai-crop", rendered: false, reason: "PDF konnte nicht geladen werden" } }
  }

  let lastDiag: PhotoDiagnostics = {
    step: "locate", method: "ai-crop", rendered: true, found: false, reason: "Kein Portrait erkannt",
  }
  const pages = Math.min(doc.numPages, FALLBACK_MAX_PAGES)
  for (let p = 1; p <= pages; p++) {
    const rendered = await renderPdfPage(doc, p)
    if ("error" in rendered) {
      lastDiag = { step: "render", method: "ai-crop", rendered: false, page: p, reason: `PDF-Render-Fehler: ${rendered.error}` }
      continue
    }
    const pageSize = `${rendered.width}x${rendered.height}`
    const boxes = await locatePortrait(rendered.png)
    if (!boxes) {
      lastDiag = { step: "locate", method: "ai-crop", rendered: true, pageSize, page: p, found: false, reason: "Kein Portrait erkannt" }
      continue
    }
    const { face, photo: photoBox } = boxes
    if (face.w > 0.8 || face.h > 0.8 || face.w < 0.02 || face.h < 0.02) {
      lastDiag = { step: "sanity", method: "ai-crop", rendered: true, pageSize, page: p, found: true, box: face, reason: "Erkannte Gesichts-Box unplausibel" }
      continue
    }
    const photo = await cropFace(rendered, face, photoBox)
    if (!photo) {
      lastDiag = { step: "crop", method: "ai-crop", rendered: true, pageSize, page: p, found: true, box: face, reason: "Zuschnitt fehlgeschlagen" }
      continue
    }
    return { photo, diag: { step: "ok", method: "ai-crop", rendered: true, pageSize, page: p, found: true, box: face } }
  }

  return { photo: null, diag: lastDiag }
}

export async function extractCandidatePhoto(pdf: Buffer): Promise<Buffer | null> {
  const { photo } = await extractCandidatePhotoDetailed(pdf)
  return photo
}
