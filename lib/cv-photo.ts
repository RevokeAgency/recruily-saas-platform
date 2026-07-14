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

// Square crop of the applicant photo itself. A CV photo is already a framed
// portrait, so instead of re-framing from the (imprecise) AI face box we trust
// the photographer: take the full photo rectangle and square it — full photo
// width, with the face bounding box only used as the vertical anchor. The
// result looks like the original photo, just square; the round avatar clips it
// to a circle with a crisp edge.
async function cropFace(r: Rendered, face: Box, photo: Box): Promise<Buffer | null> {
  try {
    const { createCanvas, loadImage } = await import("@napi-rs/canvas")
    const img = await loadImage(r.png)

    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi))

    const px = photo.x * r.width, py = photo.y * r.height
    const pw = photo.w * r.width, ph = photo.h * r.height

    const fw = face.w * r.width, fh = face.h * r.height
    const fcy = (face.y + face.h / 2) * r.height
    const faceUsable = fw > 4 && fh > 4

    // The square spans the full smaller photo dimension (usually the width,
    // since CV photos are portrait-oriented).
    const side = Math.max(1, Math.min(pw, ph))

    // Horizontal: photos are centred as shot — keep the photo's centre.
    const sx = clamp(px + (pw - side) / 2, px, Math.max(px, px + pw - side))

    // Vertical: place the face centre at ~45% from the top of the crop; without
    // a usable face box, anchor at the top (faces live in the upper part).
    const sy = faceUsable
      ? clamp(fcy - side * 0.45, py, Math.max(py, py + ph - side))
      : py

    const size = 320
    const out = createCanvas(size, size)
    const octx = out.getContext("2d")
    octx.drawImage(img, sx, sy, side, side, 0, 0, size, size)
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
