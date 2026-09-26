import mammoth from "mammoth"

import { stripHiddenDocx } from "./docx"
import { checkApplicantText } from "./instructions"
import { extractPdfGuarded } from "./pdf"
import type { DocumentFinding, ExtractedDocument, FindingSource } from "./types"

export { checkApplicantText } from "./instructions"
export * from "./types"

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

export function isDocxFile(mimeType: string | null, filename: string | null): boolean {
  return mimeType === DOCX_MIME || !!filename?.toLowerCase().endsWith(".docx")
}

export function isPdfDocument(mimeType: string | null, filename: string | null): boolean {
  return mimeType === "application/pdf" || !!filename?.toLowerCase().endsWith(".pdf")
}

/**
 * Liest Text aus einer PDF oder DOCX und lässt dabei alles weg, was ein
 * Mensch im Dokument nicht sieht. Liefert nur Befunde zu verstecktem Text;
 * die Prüfung des sichtbaren Textes übernimmt checkApplicantText.
 */
export async function extractWithoutHiddenText(
  buffer: Buffer,
  mimeType: string | null,
  filename: string | null,
  source: FindingSource,
): Promise<ExtractedDocument> {
  if (isDocxFile(mimeType, filename)) {
    const { buffer: cleaned, findings } = await stripHiddenDocx(buffer, source)
    let text = ((await mammoth.extractRawText({ buffer: cleaned })).value || "").trim()
    // Entfernte Absätze hinterlassen Leerzeilen. Nur dann zusammenfassen:
    // Bei unveränderten Dateien bleibt der Text exakt wie bisher, sonst
    // gälte jeder ältere Word-Lebenslauf als geändert.
    if (findings.length) text = text.replace(/\n{3,}/g, "\n\n")
    // Der ungefilterte Text wird nur gebraucht, wenn etwas entfernt wurde.
    const rawText = findings.length
      ? ((await mammoth.extractRawText({ buffer })).value || "").trim()
      : text
    return { text, rawText, findings }
  }
  if (isPdfDocument(mimeType, filename)) {
    return extractPdfGuarded(buffer, source)
  }
  return { text: "", rawText: "", findings: [] }
}

/** Beides in einem Schritt: versteckten Text entfernen, sichtbaren Text prüfen. */
export async function guardDocument(
  buffer: Buffer,
  mimeType: string | null,
  filename: string | null,
  source: FindingSource,
): Promise<{ text: string; findings: DocumentFinding[] }> {
  const extracted = await extractWithoutHiddenText(buffer, mimeType, filename, source)
  const checked = checkApplicantText(extracted.text, source)
  return { text: checked.text, findings: [...extracted.findings, ...checked.findings] }
}
