import { generateStructured } from "@/lib/ai/generate"
import { loadPdfjs, renderPdfPagesToPng } from "@/lib/pdf-runtime"
import { z } from "zod"
import mammoth from "mammoth"


// Structured candidate data — mirrors the schema used by /api/candidates/parse
// so the manual-upload and email-inbound paths produce identical shapes.
export const candidateSchema = z.object({
  full_name: z.string().describe("Full name of the candidate"),
  email: z.string().nullable().describe("Email address if found"),
  phone: z.string().nullable().describe("Phone number if found"),
  job_title: z.string().nullable().describe("Current or most recent job title"),
  years_of_experience: z.number().describe("Total years of work experience, estimate if not explicit"),
  experience_level: z.enum(["junior", "mid", "senior"]).describe("junior (0-2), mid (3-5), senior (6+)"),
  skills: z.array(z.string()).describe("List of technical and professional skills"),
  education: z.string().nullable().describe("Highest education degree and institution"),
  location: z.string().nullable().describe("Location/city if mentioned"),
  summary_ai: z.string().describe("A compelling 2-sentence pitch highlighting the candidate's strengths"),
})

export type ParsedCandidate = z.infer<typeof candidateSchema>

const systemPrompt = `Du bist ein HR-Experte. Analysiere den Lebenslauf/CV und extrahiere alle relevanten Informationen.

Wichtig:
- Extrahiere alle Skills (technische und Soft Skills)
- Schätze die Berufserfahrung in Jahren
- Erstelle einen kurzen, professionellen 2-Satz-Pitch über den Kandidaten
- Falls ein Anschreiben mitgeliefert wird, berücksichtige es für Soft Skills und Motivation
- Antworte auf Deutsch`

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

function isDocx(mimeType: string | null, filename: string | null): boolean {
  return mimeType === DOCX_MIME || !!filename?.toLowerCase().endsWith(".docx")
}

function isPdf(mimeType: string | null, filename: string | null): boolean {
  return mimeType === "application/pdf" || !!filename?.toLowerCase().endsWith(".pdf")
}

/** True for attachment types we can turn into a CV. */
export function isSupportedCvType(mimeType: string | null, filename: string | null): boolean {
  return isPdf(mimeType, filename) || isDocx(mimeType, filename) ||
    !!filename?.toLowerCase().endsWith(".doc")
}

/**
 * Parses a CV buffer (PDF or DOCX) into structured candidate data. PDFs are sent
 * straight to Gemini (which reads text PDFs and, later, scanned PDFs via OCR);
 * DOCX is converted to text with mammoth first. An optional cover letter is
 * appended so the AI can factor motivation / soft skills into the summary.
 *
 * Returns null when nothing usable could be extracted — callers must handle this
 * (e.g. store the email under "Nicht zugeordnet") instead of creating an empty
 * candidate.
 */
export async function parseCvBuffer(
  buffer: Buffer,
  mimeType: string | null,
  filename: string | null,
  coverLetter?: string | null,
): Promise<ParsedCandidate | null> {
  try {
    const coverBlock = coverLetter?.trim()
      ? `\n\n=== ANSCHREIBEN / E-MAIL-TEXT ===\n${coverLetter.trim()}`
      : ""

    if (isDocx(mimeType, filename)) {
      const { value: text } = await mammoth.extractRawText({ buffer })
      if (!text || text.trim().length < 30) return null
      const { output } = await generateStructured({
        task: "extraction",
        label: "CV-Analyse",
        schema: candidateSchema,
        system: systemPrompt,
        prompt: `CV-Inhalt:\n${text}${coverBlock}`,
      })
      return output ?? null
    }

    if (isPdf(mimeType, filename)) {
      // Text wird lokal aus dem PDF extrahiert und als Text übergeben — so
      // bleibt der Pfad provider-unabhängig (Mistral hat keine native
      // PDF-Eingabe) und es wandert kein Rohdokument zum Modell.
      const text = await extractDocumentText(buffer, mimeType, filename)
      if (text && text.trim().length >= 30) {
        const { output } = await generateStructured({
          task: "extraction",
          label: "CV-Analyse",
          schema: candidateSchema,
          system: systemPrompt,
          prompt: `CV-Inhalt:\n${text}${coverBlock}`,
        })
        return output ?? null
      }
      // Keine Textebene → gescanntes/fotografiertes PDF. Seiten als Bild an
      // das Bildmodell geben, statt den Lebenslauf abzuweisen.
      return await parseScannedPdf(buffer, coverBlock)
    }

    return null
  } catch (err) {
    console.error("parseCvBuffer failed:", err)
    return null
  }
}

/** Basic sanity check that the AI actually extracted a candidate (not an empty shell). */
export function isUsableCandidate(c: ParsedCandidate | null): c is ParsedCandidate {
  return !!c && !!c.full_name && c.full_name.trim().length > 1
}

/** True for PDF attachments (used to decide whether to attempt photo extraction). */
export function isPdfFile(mimeType: string | null, filename: string | null): boolean {
  return isPdf(mimeType, filename)
}

/**
 * Extracts plain text from a cover-letter / motivation document (PDF or DOCX)
 * so it can be stored and fed into matching. Best-effort: returns "" on failure.
 */
export async function extractDocumentText(
  buffer: Buffer,
  mimeType: string | null,
  filename: string | null,
): Promise<string> {
  try {
    if (isDocx(mimeType, filename)) {
      const { value } = await mammoth.extractRawText({ buffer })
      return (value || "").trim()
    }
    if (isPdf(mimeType, filename)) {
      // Über die gemeinsame Laufzeitumgebung — ohne gesetzten Worker und
      // Browser-Globals scheitert pdfjs in Serverless bei praktisch jedem PDF.
      const pdfjs = await loadPdfjs()
      const doc = await pdfjs.getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: true,
      }).promise
      const pages = Math.min(doc.numPages, 6)
      let text = ""
      for (let i = 1; i <= pages; i++) {
        const page = await doc.getPage(i)
        const content = await page.getTextContent()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        text += content.items.map((it: any) => ("str" in it ? it.str : "")).join(" ") + "\n"
      }
      return text.trim()
    }
    return ""
  } catch (err) {
    console.error("extractDocumentText failed:", err)
    return ""
  }
}

/**
 * Liest einen gescannten Lebenslauf (PDF ohne Textebene), indem die Seiten
 * gerendert und von einem Bildmodell ausgewertet werden. In der Praxis kommt
 * das häufiger vor, als man denkt — eingescannte oder abfotografierte CVs.
 */
async function parseScannedPdf(buffer: Buffer, coverBlock: string): Promise<ParsedCandidate | null> {
  const pages = await renderPdfPagesToPng(buffer, 2)
  if (pages.length === 0) return null
  try {
    const { output } = await generateStructured({
      task: "vision",
      label: "CV-Analyse (gescannt)",
      schema: candidateSchema,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: `Analysiere diesen eingescannten Lebenslauf.${coverBlock}` },
            ...pages.map((png) => ({ type: "image" as const, image: png })),
          ],
        },
      ],
    })
    return output ?? null
  } catch (err) {
    console.error("[cv-parse] Auswertung des gescannten PDFs fehlgeschlagen:", err)
    return null
  }
}
