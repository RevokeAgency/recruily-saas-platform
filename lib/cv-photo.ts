import { generateText, Output } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { z } from "zod"

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

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

async function renderPdfFirstPage(pdf: Buffer, scale = 2): Promise<Rendered | null> {
  try {
    const pdfjs: typeof import("pdfjs-dist/legacy/build/pdf.mjs") = await import(
      "pdfjs-dist/legacy/build/pdf.mjs"
    )
    const { createCanvas } = await import("@napi-rs/canvas")

    const doc = await pdfjs.getDocument({
      data: new Uint8Array(pdf),
      disableFontFace: true,
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
    console.error("[cv-photo] pdf render failed:", err)
    return null
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
                "Das ist die erste Seite eines Lebenslaufs. Enthält sie ein Bewerbungsfoto / Portrait einer echten Person, gib die Bounding Box um Kopf und Schultern zurück (normalisiert 0-1000: ymin, xmin, ymax, xmax) und found=true. Ignoriere Firmenlogos, Icons, Illustrationen und Cliparts. Ist kein echtes Personenfoto vorhanden, setze found=false und alle Werte auf 0.",
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

    const bw = box.w * r.width
    const bh = box.h * r.height
    const cx = box.x * r.width + bw / 2
    const cy = box.y * r.height + bh / 2

    // Square crop around the portrait with a bit of headroom.
    let side = Math.max(bw, bh) * 1.5
    side = Math.min(side, r.width, r.height)
    const sx = Math.max(0, Math.min(cx - side / 2, r.width - side))
    const sy = Math.max(0, Math.min(cy - side / 2, r.height - side))

    const size = 256
    const out = createCanvas(size, size)
    const octx = out.getContext("2d")
    octx.drawImage(img, sx, sy, side, side, 0, 0, size, size)
    return out.toBuffer("image/jpeg")
  } catch (err) {
    console.error("[cv-photo] crop failed:", err)
    return null
  }
}

export async function extractCandidatePhoto(pdf: Buffer): Promise<Buffer | null> {
  const rendered = await renderPdfFirstPage(pdf)
  if (!rendered) return null

  const box = await locatePortrait(rendered.png)
  if (!box) return null

  // Sanity: reject boxes that are basically the whole page or implausibly tiny.
  if (box.w > 0.85 || box.h > 0.85 || box.w < 0.03 || box.h < 0.03) return null

  return cropSquare(rendered, box)
}
