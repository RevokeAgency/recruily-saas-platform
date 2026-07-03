import { generateText, Output } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { z } from "zod"
import mammoth from "mammoth"

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

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
      const { output } = await generateText({
        model: google("gemini-2.5-flash"),
        output: Output.object({ schema: candidateSchema }),
        system: systemPrompt,
        prompt: `CV-Inhalt:\n${text}${coverBlock}`,
      })
      return output ?? null
    }

    if (isPdf(mimeType, filename)) {
      const { output } = await generateText({
        model: google("gemini-2.5-flash"),
        output: Output.object({ schema: candidateSchema }),
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: `${systemPrompt}\n\nAnalysiere diesen Lebenslauf:${coverBlock}` },
              {
                type: "file",
                data: buffer.toString("base64"),
                mediaType: mimeType || "application/pdf",
                filename: filename || "cv.pdf",
              },
            ],
          },
        ],
      })
      return output ?? null
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
