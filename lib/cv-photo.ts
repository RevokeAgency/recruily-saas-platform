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
 * Best-effort applicant-photo extraction from a CV PDF:
 *   1. render page 1 to a PNG (pdfjs + @napi-rs/canvas),
 *   2. ask Gemini for the portrait bounding box (or "none"),
 *   3. crop a padded square and return a small JPEG.
 *
 * Every step is guarded: on any failure (no photo, render error, weird box)
 * it returns null and the UI falls back to the initials avatar. Never throws.
 */

type Rendered = { png: Buffer; width: number; height: number }
type RenderResult = Rendered | { error: string }

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

async function renderPdfFirstPage(pdf: Buffer, scale = 2): Promise<RenderResult> {
  try {
    await ensurePdfGlobals()
    const pdfjs: typeof import("pdfjs-dist/legacy/build/pdf.mjs") = await import(
      "pdfjs-dist/legacy/build/pdf.mjs"
    )
    const { createCanvas } = await import("@napi-rs/canvas")

    // Point pdfjs at the vendored worker so the fake-worker setup finds it.
    if (WORKER_SRC) pdfjs.GlobalWorkerOptions.workerSrc = WORKER_SRC

    const doc = await pdfjs.getDocument({
      data: new Uint8Array(pdf),
      useSystemFonts: true,
    }).promise
    const page = await doc.getPage(1)
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
                "Das ist die erste Seite eines Lebenslaufs. Enthält sie ein Bewerbungsfoto einer echten Person, gib ZWEI Bounding Boxes zurück (normalisiert 0-1000): " +
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
    // Fall back to the whole page if the photo rectangle came back degenerate.
    if (photo.w < 0.02 || photo.h < 0.02) photo = { x: 0, y: 0, w: 1, h: 1 }
    return { face, photo }
  } catch (err) {
    console.error("[cv-photo] locate failed:", err)
    return null
  }
}

// Shrinks a rectangle to the tight bounds of its non-white content by scanning
// pixel rows/columns from each edge. The AI photo box is never pixel-exact, so
// without this a sliver of the white page ends up inside the avatar circle.
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
  const maxTrim = 0.45 // never eat more than 45% from one side
  while (top < h * maxTrim && isWhiteRow(top)) top++
  while (bottom > h * (1 - maxTrim) && isWhiteRow(bottom)) bottom--
  while (left < w * maxTrim && isWhiteCol(left)) left++
  while (right > w * (1 - maxTrim) && isWhiteCol(right)) right--

  if (right - left < 8 || bottom - top < 8) return { x: 0, y: 0, w, h }
  return { x: left, y: top, w: right - left + 1, h: bottom - top + 1 }
}

// Square crop of the applicant photo itself. A CV photo is already a framed
// portrait, so instead of re-framing from the (imprecise) AI face box we trust
// the photographer: pixel-trim the detected photo rectangle to its true edges
// (no page white), square it at full width with the face box as vertical
// anchor, and over-zoom ~4% so no hairline border can survive. The round
// avatar clips the square to a circle that is fully covered by photo.
async function cropFace(r: Rendered, face: Box, photo: Box): Promise<Buffer | null> {
  try {
    const { createCanvas, loadImage } = await import("@napi-rs/canvas")
    const img = await loadImage(r.png)

    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi))

    let px = Math.max(0, Math.floor(photo.x * r.width))
    let py = Math.max(0, Math.floor(photo.y * r.height))
    let pw = Math.min(Math.ceil(photo.w * r.width), r.width - px)
    let ph = Math.min(Math.ceil(photo.h * r.height), r.height - py)

    // Pixel-trim a page-space rect; returns the rect shrunk to non-white content.
    const pixelTrim = (x: number, y: number, w: number, h: number) => {
      const scan = createCanvas(w, h)
      const sctx = scan.getContext("2d")
      sctx.drawImage(img, x, y, w, h, 0, 0, w, h)
      const t = trimWhiteBorders(sctx.getImageData(0, 0, w, h).data, w, h)
      return { x: x + t.x, y: y + t.y, w: t.w, h: t.h, rel: t }
    }

    // The AI box often UNDER-shoots the photo (cutting into it, which makes the
    // face look over-zoomed). Inflate the box generously and let the pixel trim
    // pull it back to the true photo edges, recovering the full photo area.
    if (pw > 8 && ph > 8) {
      const inflX = Math.round(pw * 0.25)
      const inflY = Math.round(ph * 0.25)
      const ix = Math.max(0, px - inflX)
      const iy = Math.max(0, py - inflY)
      const iw = Math.min(r.width - ix, px + pw + inflX - ix)
      const ih = Math.min(r.height - iy, py + ph + inflY - iy)

      const t = pixelTrim(ix, iy, iw, ih)

      // Per-side guard: if the trim consumed almost none of the inflation on a
      // side, the content touching that inflated edge is likely neighbouring
      // text rather than photo — fall back to the AI edge for that side.
      const left = t.rel.x < 2 && ix < px ? px : t.x
      const top = t.rel.y < 2 && iy < py ? py : t.y
      const rightEdge = iw - (t.rel.x + t.rel.w) < 2 && ix + iw > px + pw ? px + pw : t.x + t.w
      const bottomEdge = ih - (t.rel.y + t.rel.h) < 2 && iy + ih > py + ph ? py + ph : t.y + t.h

      if (rightEdge - left > 8 && bottomEdge - top > 8) {
        // Second pass without inflation: removes any residual white on sides
        // that fell back to the (over-shooting) AI edge.
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

    // Frame the face: a square ~2.0× the face box, centered horizontally on the
    // face and sitting it a touch above the middle so the eyes land in the upper
    // half of the circle. We deliberately DON'T clamp the square inside the photo
    // rect — a tightly-shot CV photo has no headroom above the hair, so clamping
    // jams the head against the circle edge. Instead we allow the square to spill
    // out (up to ~35% padding) and fill the spill with the photo's own backdrop
    // colour, guaranteeing breathing room around the head.
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

    // Sample the photo's background colour from points around the top/upper edges
    // (behind and beside the head — almost always the backdrop). Median per
    // channel resists an outlier sample that clips hair or clothing.
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

    // Draw only the part of the square that overlaps the photo rect; everything
    // outside stays the sampled backdrop colour (never page white, never text).
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

export type PhotoDiagnostics = {
  step: "render" | "locate" | "sanity" | "crop" | "ok"
  rendered?: boolean
  pageSize?: string
  found?: boolean
  box?: Box | null
  reason?: string
}

/** Full pipeline with per-step diagnostics (used by the retry endpoint). */
export async function extractCandidatePhotoDetailed(
  pdf: Buffer,
): Promise<{ photo: Buffer | null; diag: PhotoDiagnostics }> {
  const rendered = await renderPdfFirstPage(pdf)
  if ("error" in rendered) {
    return { photo: null, diag: { step: "render", rendered: false, reason: `PDF-Render-Fehler: ${rendered.error}` } }
  }
  const pageSize = `${rendered.width}x${rendered.height}`

  const boxes = await locatePortrait(rendered.png)
  if (!boxes) {
    return { photo: null, diag: { step: "locate", rendered: true, pageSize, found: false, reason: "Kein Portrait erkannt" } }
  }
  const { face, photo: photoBox } = boxes

  if (face.w > 0.8 || face.h > 0.8 || face.w < 0.02 || face.h < 0.02) {
    return { photo: null, diag: { step: "sanity", rendered: true, pageSize, found: true, box: face, reason: "Erkannte Gesichts-Box unplausibel (zu groß/klein)" } }
  }

  const photo = await cropFace(rendered, face, photoBox)
  if (!photo) {
    return { photo: null, diag: { step: "crop", rendered: true, pageSize, found: true, box: face, reason: "Zuschnitt fehlgeschlagen" } }
  }

  return { photo, diag: { step: "ok", rendered: true, pageSize, found: true, box: face } }
}

export async function extractCandidatePhoto(pdf: Buffer): Promise<Buffer | null> {
  const { photo } = await extractCandidatePhotoDetailed(pdf)
  return photo
}
