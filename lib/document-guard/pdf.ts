import { existsSync } from "node:fs"
import { join } from "node:path"

import { loadPdfjs } from "@/lib/pdf-runtime"
import { mergeAdjacent, type DocumentFinding, type ExtractedDocument, type FindingReason, type FindingSource } from "./types"

// ─────────────────────────────────────────────────────────────────────────────
// Versteckter Text in PDFs.
//
// Die Textebene eines PDFs sagt nichts darüber, ob ein Mensch den Text sieht.
// Deshalb wird jede Seite gerendert und für jedes Textstück geprüft, ob an
// seiner Stelle überhaupt etwas zu sehen ist (Helligkeitsunterschied im
// Bildausschnitt). Damit fallen alle Tricks auf einmal auf: weiß auf weiß,
// fast weiß, unter einem Kasten verdeckt, Rendermodus "unsichtbar".
//
// Ergebnis der Probe mit echten Test-PDFs: versteckter Text hat Kontrast 0–3,
// hellgraue Fußnoten ~70, weißer Text auf dunkler Seitenleiste ~210. Der
// Schwellwert liegt mit Abstand dazwischen.
//
// Durchsuchbare Scans (Bild plus unsichtbare OCR-Ebene darüber) sind KEIN
// Fehlalarm: Unter der OCR-Ebene liegt das Bild des Textes, also Kontrast.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_PAGES = 6
const SCALE = 1.5
/** Kleiner als jede lesbare Fußnote (die liegen bei 6–8 pt). */
const MIN_FONT_PT = 3
/** Durchschnittliche Zeichenbreite, unter der Text auf Unleserlichkeit gestaucht ist. */
const MIN_CHAR_WIDTH_PT = 0.6
/** Helligkeitsunterschied (0–255), ab dem Text als sichtbar gilt. */
const MIN_CONTRAST = 24

interface TextItem {
  str: string
  transform: number[]
  width: number
  fontName: string
}

type ItemVerdict = FindingReason | "sichtbar"

// Standardschriften (Helvetica, Times …) sind oft nicht eingebettet. pdfjs
// zeichnet sie dann mit Systemschriften, und die fehlen in Serverless-
// Umgebungen. Liegen die mitgelieferten Schriftdaten vor, werden sie genutzt.
// Fehlen sie, greift die Absicherung pro Schrift weiter unten.
function standardFontDataUrl(): string | undefined {
  const dir = join(process.cwd(), "node_modules", "pdfjs-dist", "standard_fonts")
  return existsSync(dir) ? `${dir}/` : undefined
}

export async function extractPdfGuarded(buffer: Buffer, source: FindingSource): Promise<ExtractedDocument> {
  const pdfjs = await loadPdfjs()
  const fontData = standardFontDataUrl()
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    ...(fontData ? { standardFontDataUrl: fontData } : {}),
  }).promise

  const pages = Math.min(doc.numPages, MAX_PAGES)
  const visiblePages: string[] = []
  const rawPages: string[] = []
  const hidden: DocumentFinding[] = []

  for (let p = 1; p <= pages; p++) {
    const page = await doc.getPage(p)
    const content = await page.getTextContent()
    const items = (content.items as unknown[]).filter((it): it is TextItem => typeof (it as TextItem)?.str === "string")
    rawPages.push(items.map((it) => it.str).join(" "))

    const verdicts = await classifyPage(pdfjs, page, items)
    visiblePages.push(items.filter((_, i) => verdicts[i] === "sichtbar").map((it) => it.str).join(" "))
    items.forEach((it, i) => {
      const v = verdicts[i]
      if (v !== "sichtbar" && it.str.trim()) hidden.push({ source, reason: v, page: p, excerpt: it.str })
    })
  }

  return {
    text: visiblePages.join("\n").trim(),
    rawText: rawPages.join("\n").trim(),
    findings: mergeAdjacent(hidden),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function classifyPage(pdfjs: any, page: any, items: TextItem[]): Promise<ItemVerdict[]> {
  const base = page.getViewport({ scale: 1 })

  // 1) Regeln ohne Rendering: Schriftgröße, Stauchung, Lage auf der Seite.
  const verdicts: ItemVerdict[] = items.map((it) => {
    if (!it.str.trim()) return "sichtbar"
    const size = Math.hypot(it.transform[2], it.transform[3])
    if (size > 0 && size < MIN_FONT_PT) return "winzig"
    const chars = it.str.trim().length
    if (chars >= 4 && it.width > 0 && it.width / chars < MIN_CHAR_WIDTH_PT) return "winzig"
    const t = pdfjs.Util.transform(base.transform, it.transform)
    const h = Math.hypot(t[2], t[3])
    const x0 = t[4], x1 = t[4] + it.width, y0 = t[5] - h, y1 = t[5]
    if (x1 < 0 || x0 > base.width || y1 < 0 || y0 > base.height) return "ausserhalb"
    return "sichtbar"
  })

  // 2) Sichtprüfung am gerenderten Bild. Scheitert das Rendering, bleibt es
  //    bei Schritt 1: lieber einen Trick übersehen als echten Text entfernen.
  let img: Uint8ClampedArray
  let cw: number, ch: number
  const vp = page.getViewport({ scale: SCALE })
  try {
    const canvas = await import("@napi-rs/canvas")
    const cv = canvas.createCanvas(Math.ceil(vp.width), Math.ceil(vp.height))
    const ctx = cv.getContext("2d")
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, cv.width, cv.height)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await page.render({ canvasContext: ctx as any, viewport: vp, canvas: cv as any }).promise
    img = ctx.getImageData(0, 0, cv.width, cv.height).data
    cw = cv.width
    ch = cv.height
  } catch (err) {
    console.error("[document-guard] Seite konnte nicht gerendert werden, nur Grundprüfung:", err)
    return verdicts
  }

  const contrast: Array<number | null> = items.map((it, i) => {
    if (verdicts[i] !== "sichtbar" || !it.str.trim()) return null
    const t = pdfjs.Util.transform(vp.transform, it.transform)
    const h = Math.hypot(t[2], t[3])
    // Gedrehter Text: Das Rechteck wäre falsch, also keine Aussage.
    if (Math.abs(t[1]) > 0.01 * h || Math.abs(t[2]) > 0.01 * h) return null
    const x0 = Math.max(0, Math.floor(t[4]))
    const x1 = Math.min(cw, Math.ceil(t[4] + it.width * SCALE))
    const y0 = Math.max(0, Math.floor(t[5] - h))
    const y1 = Math.min(ch, Math.ceil(t[5] + 0.2 * h))
    if ((x1 - x0) * (y1 - y0) < 4) return null
    let min = 255
    let max = 0
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const k = (y * cw + x) * 4
        const l = 0.2126 * img[k] + 0.7152 * img[k + 1] + 0.0722 * img[k + 2]
        if (l < min) min = l
        if (l > max) max = l
      }
      if (max - min >= MIN_CONTRAST) break
    }
    return max - min
  })

  // Schriften, die nicht eingebettet sind und für die keine Schriftdaten
  // vorliegen, zeichnet der Server womöglich gar nicht. Für sie gilt die
  // Sichtprüfung nur, wenn dieselbe Schrift auf der Seite nachweislich
  // sichtbar gezeichnet wurde. Sonst wäre jeder Text dieser Schrift ein
  // Fehlalarm.
  const fontRenders = new Map<string, boolean>()
  const unreliableFont = (name: string): boolean => {
    try {
      const font = page.commonObjs.get(name)
      return !!font?.missingFile
    } catch {
      return true
    }
  }
  items.forEach((it, i) => {
    const c = contrast[i]
    if (c != null && c >= MIN_CONTRAST) fontRenders.set(it.fontName, true)
  })

  return verdicts.map((v, i) => {
    const c = contrast[i]
    if (v !== "sichtbar" || c == null || c >= MIN_CONTRAST) return v
    const font = items[i].fontName
    if (unreliableFont(font) && !fontRenders.get(font)) return "sichtbar"
    return "unsichtbar"
  })
}
