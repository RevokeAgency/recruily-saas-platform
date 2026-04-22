import { generateText, Output } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { z } from "zod"
import mammoth from "mammoth"

// Create Google Gemini provider with API key from environment
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

// Schema for parsed candidate data - using nullable() for OpenAI strict mode compatibility
const candidateSchema = z.object({
  full_name: z.string().describe("Full name of the candidate"),
  email: z.string().nullable().describe("Email address if found"),
  phone: z.string().nullable().describe("Phone number if found"),
  job_title: z.string().nullable().describe("Current or most recent job title"),
  years_of_experience: z.number().describe("Total years of work experience, estimate if not explicit"),
  experience_level: z.enum(["junior", "mid", "senior"]).describe("Experience level based on years: junior (0-2), mid (3-5), senior (6+)"),
  skills: z.array(z.string()).describe("List of technical and professional skills"),
  education: z.string().nullable().describe("Highest education degree and institution"),
  location: z.string().nullable().describe("Location/city if mentioned"),
  summary_ai: z.string().describe("A compelling 2-sentence pitch about this candidate highlighting their strengths"),
})

const systemPrompt = `Du bist ein HR-Experte. Analysiere den Lebenslauf/CV und extrahiere alle relevanten Informationen.

Wichtig:
- Extrahiere alle Skills (technische und Soft Skills)
- Schätze die Berufserfahrung in Jahren
- Erstelle einen kurzen, professionellen 2-Satz-Pitch über den Kandidaten
- Antworte auf Deutsch`

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { fileData, fileName, mimeType, textContent } = body

    // If text content is provided (fallback method)
    if (textContent) {
      const { output } = await generateText({
        model: google("gemini-2.5-flash"),
        output: Output.object({
          schema: candidateSchema,
        }),
        system: systemPrompt,
        prompt: `CV-Inhalt:\n${textContent}`,
      })

      if (!output) {
        return Response.json(
          { error: "Konnte keine Daten aus dem CV extrahieren" },
          { status: 400 }
        )
      }

      return Response.json({ data: output })
    }

    // For file uploads
    if (fileData) {
      // Check if it's a DOCX file - these need text extraction first
      const isDocx = mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
                     (fileName && fileName.toLowerCase().endsWith(".docx"))

      if (isDocx) {
        // Extract text from DOCX using mammoth
        const buffer = Buffer.from(fileData, "base64")
        const result = await mammoth.extractRawText({ buffer })
        const extractedText = result.value

        if (!extractedText || extractedText.trim().length === 0) {
          return Response.json(
            { error: "Konnte keinen Text aus dem DOCX extrahieren" },
            { status: 400 }
          )
        }

        // Now analyze the extracted text
        const { output } = await generateText({
          model: google("gemini-2.5-flash"),
          output: Output.object({
            schema: candidateSchema,
          }),
          system: systemPrompt,
          prompt: `CV-Inhalt:\n${extractedText}`,
        })

        if (!output) {
          return Response.json(
            { error: "Konnte keine Daten aus dem CV extrahieren" },
            { status: 400 }
          )
        }

        return Response.json({ data: output })
      }

      // For PDF files, use direct file upload to Gemini
      const { output } = await generateText({
        model: google("gemini-2.5-flash"),
        output: Output.object({
          schema: candidateSchema,
        }),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `${systemPrompt}\n\nAnalysiere diesen Lebenslauf:`,
              },
              {
                type: "file",
                data: fileData,
                mediaType: mimeType || "application/pdf",
                filename: fileName || "cv.pdf",
              },
            ],
          },
        ],
      })

      if (!output) {
        return Response.json(
          { error: "Konnte keine Daten aus dem CV extrahieren" },
          { status: 400 }
        )
      }

      return Response.json({ data: output })
    }

    return Response.json(
      { error: "Keine Daten zum Analysieren vorhanden" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Error parsing candidate CV:", error)
    return Response.json(
      { error: "Fehler beim Analysieren des CVs. Bitte versuchen Sie es erneut." },
      { status: 500 }
    )
  }
}
