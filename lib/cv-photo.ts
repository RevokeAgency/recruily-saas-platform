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

const boxSchema = z.object({
  found: z.boolean().describe("true only if a real person's portrait/headshot photo is present"),
  ymin: z.number().describe("top edge, 0-1000"),
  xmin: z.number().describe("left edge, 0-1000"),
  ymax: z.number().describe("bottom edge, 0-1000"),
  xmax: z.number().describe("right edge, 0-1000"),
})

async function locatePortrait(png: Buffer): Promise<{ x: number; y: number; w: number; h: number } | null> {
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
                "Das ist die erste Seite eines Lebenslaufs. Enthält sie ein Bewerbungsfoto einer echten Person, gib die Bounding Box GENAU um die Kanten des Fotos zurück (das rechteckige Bild selbst, eng an den Bildrändern, ohne den weißen Seitenhintergrund) - normalisiert 0-1000: ymin, xmin, ymax, xmax - und found=true. Ignoriere Firmenlogos, Icons, Illustrationen und Cliparts. Ist kein echtes Personenfoto vorhanden, setze found=false und alle Werte auf 0.",
            },
            { type: "image", image: png },
          ],
        },
      ],
    })
    if (!output || !output.found) return null
    const x = Math.min(output.xmin, output.xmax) / 1000
    const y = Math.min(output.ymin, output.ymax) / 1000
    const w = Math.abs(output.xmax - output.xmin) / 1000
    const h = Math.abs(output.ymax - output.ymin) / 1000
    return { x, y, w, h }
  } catch (err) {
    console.error("[cv-photo] locate failed:", err)
    return null
  }
}

async function cropSquare(
  r: Rendered,
  box: { x: number; y: number; w: number; h: number },
): Promise<Buffer | null> {
  try {
    const { createCanvas, loadImage } = await import("@napi-rs/canvas")
    const img = await loadImage(r.png)

    // Inset the detected photo rectangle slightly to eat any thin white border.
    const inset = 0.03
    const bx = (box.x + box.w * inset) * r.width
    const by = (box.y + box.h * inset) * r.height
    const bw = box.w * (1 - 2 * inset) * r.width
    const bh = box.h * (1 - 2 * inset) * r.height

    // Square that fits INSIDE the photo (no page background), centered
    // horizontally and biased slightly up so the face stays in frame.
    const side = Math.max(1, Math.min(bw, bh))
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi))
    const sx = clamp(bx + (bw - side) / 2, bx, bx + bw - side)
    const sy = clamp(by + (bh - side) * 0.28, by, by + bh - side)

    const size = 320
    const out = createCanvas(size, size)
    const octx = out.getContext("2d")
    octx.drawImage(img, sx, sy, side, side, 0, 0, size, size)
    return out.toBuffer("image/jpeg")
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
  box?: { x: number; y: number; w: number; h: number } | null
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

  const box = await locatePortrait(rendered.png)
  if (!box) {
    return { photo: null, diag: { step: "locate", rendered: true, pageSize, found: false, reason: "Kein Portrait erkannt" } }
  }

  if (box.w > 0.85 || box.h > 0.85 || box.w < 0.03 || box.h < 0.03) {
    return { photo: null, diag: { step: "sanity", rendered: true, pageSize, found: true, box, reason: "Erkannte Box unplausibel (zu groß/klein)" } }
  }

  const photo = await cropSquare(rendered, box)
  if (!photo) {
    return { photo: null, diag: { step: "crop", rendered: true, pageSize, found: true, box, reason: "Zuschnitt fehlgeschlagen" } }
  }

  return { photo, diag: { step: "ok", rendered: true, pageSize, found: true, box } }
}

export async function extractCandidatePhoto(pdf: Buffer): Promise<Buffer | null> {
  const { photo } = await extractCandidatePhotoDetailed(pdf)
  return photo
}
