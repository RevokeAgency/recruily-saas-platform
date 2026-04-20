import { generateText, Output } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { z } from "zod"

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

// Schema for parsed candidate data
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

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { fileData, fileName, mimeType, textContent } = body

    let content: string

    // If text content is provided directly (fallback method)
    if (textContent) {
      content = textContent
    } else if (fileData) {
      // For file uploads, we'll send the base64 data to Gemini
      // Gemini can process PDFs directly
      content = `[File: ${fileName}]\n\nPlease analyze this CV/resume document.`
    } else {
      return Response.json(
        { error: "Keine Daten zum Analysieren vorhanden" },
        { status: 400 }
      )
    }

    const { output } = await generateText({
      model: google("gemini-2.5-flash"),
      output: Output.object({
        schema: candidateSchema,
      }),
      messages: fileData ? [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Du bist ein HR-Experte. Analysiere diesen Lebenslauf/CV und extrahiere alle relevanten Informationen.
              
Wichtig:
- Extrahiere alle Skills (technische und Soft Skills)
- Schätze die Berufserfahrung in Jahren
- Erstelle einen kurzen, professionellen 2-Satz-Pitch über den Kandidaten
- Antworte auf Deutsch

CV-Inhalt:`,
            },
            {
              type: "file",
              data: fileData,
              mimeType: mimeType || "application/pdf",
            },
          ],
        },
      ] : [
        {
          role: "user",
          content: `Du bist ein HR-Experte. Analysiere diesen Lebenslauf/CV und extrahiere alle relevanten Informationen.
              
Wichtig:
- Extrahiere alle Skills (technische und Soft Skills)
- Schätze die Berufserfahrung in Jahren
- Erstelle einen kurzen, professionellen 2-Satz-Pitch über den Kandidaten
- Antworte auf Deutsch

CV-Inhalt:
${content}`,
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
  } catch (error) {
    console.error("Error parsing candidate CV:", error)
    return Response.json(
      { error: "Fehler beim Analysieren des CVs. Bitte versuchen Sie es erneut." },
      { status: 500 }
    )
  }
}
