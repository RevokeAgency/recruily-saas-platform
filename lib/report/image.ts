// ─────────────────────────────────────────────────────────────────────────────
// Logo für den Revetly Report aufbereiten (nur Server).
//
// Hochgeladene Logos haben oft viel leeren oder transparenten Rand. Im
// Kopf des PDFs ist das Logo nur so hoch wie die Kopfzeile, der Rand frisst
// davon den Großteil, und das eigentliche Logo wird winzig. Deshalb:
//   1. Bild laden (PNG, JPEG, WebP, SVG …) über @napi-rs/canvas,
//   2. transparenten und weißen Rand abschneiden,
//   3. als PNG ausgeben, das react-pdf sicher darstellen kann.
// Scheitert etwas, bleibt das Original, sofern react-pdf es lesen kann.
// ─────────────────────────────────────────────────────────────────────────────

/** react-pdf kann nur PNG und JPEG. */
export function isPdfImage(buf: Buffer): boolean {
  const png = buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
  const jpg = buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
  return png || jpg
}

// Größte Kante beim Aufbereiten. Reicht für scharfen Druck in der Kopfzeile.
const MAX_EDGE = 1200

/** Bereich, in dem das Bild Inhalt hat (nicht transparent, nicht fast weiß). */
export function contentBounds(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
): { x: number; y: number; w: number; h: number } | null {
  let top = height, bottom = -1, left = width, right = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const a = data[i + 3]
      if (a < 16) continue
      if (data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245) continue
      if (y < top) top = y
      if (y > bottom) bottom = y
      if (x < left) left = x
      if (x > right) right = x
    }
  }
  if (bottom < 0) return null
  return { x: left, y: top, w: right - left + 1, h: bottom - top + 1 }
}

export async function prepareLogo(buf: Buffer): Promise<Buffer | null> {
  try {
    const canvas = await import("@napi-rs/canvas")
    const img = await canvas.loadImage(buf)
    const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
    const w = Math.max(1, Math.round(img.width * scale))
    const h = Math.max(1, Math.round(img.height * scale))
    const src = canvas.createCanvas(w, h)
    const ctx = src.getContext("2d")
    ctx.drawImage(img, 0, 0, w, h)
    const box = contentBounds(ctx.getImageData(0, 0, w, h).data, w, h)
    if (!box) return isPdfImage(buf) ? buf : null
    const out = canvas.createCanvas(box.w, box.h)
    out.getContext("2d").drawImage(src, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h)
    return out.toBuffer("image/png")
  } catch (err) {
    console.error("[report] Logo konnte nicht aufbereitet werden:", err)
    return isPdfImage(buf) ? buf : null
  }
}
