import { generateText, Output } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { z } from "zod"

// Create Google Gemini provider with API key from environment
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

// Schema for parsed job data
const jobSchema = z.object({
  title: z.string().describe("The job title, e.g. 'Senior Frontend Developer'"),
  company: z.string().describe("The company name"),
  location: z.string().nullable().describe("Job location, city and country"),
  employmentType: z.enum(["full-time", "part-time", "remote", "contract"]).describe("Type of employment"),
  salaryRange: z.string().nullable().describe("Salary range if mentioned, format: €XX.XXX - €XX.XXX"),
  description: z.string().describe("Full job description including responsibilities"),
  requiredSkills: z.array(z.string()).describe("List of required technical and soft skills"),
  niceToHaveSkills: z.array(z.string()).describe("List of nice-to-have or preferred skills"),
  yearsExperience: z.string().nullable().describe("Required years of experience, e.g. '3-5 Jahre'"),
  education: z.string().nullable().describe("Required education level or degree"),
  languages: z.array(z.string()).describe("Required language skills with proficiency level"),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { type, content, url, fileData, fileName, mimeType } = body

    console.log("[v0] Job Parse Request:", { type, url: url?.slice(0, 50), fileName })

    // Validate URL type requests
    if (type === "url") {
      if (!url || typeof url !== "string") {
        return Response.json(
          { error: "URL ist erforderlich" },
          { status: 400 }
        )
      }

      // Validate URL format
      try {
        new URL(url)
      } catch {
        return Response.json(
          { error: "Ungültige URL. Bitte geben Sie eine vollständige URL ein (z.B. https://example.com/job)" },
          { status: 400 }
        )
      }
    }

    let messages: Parameters<typeof generateText>[0]["messages"]

    if (type === "url") {
      // Fetch the URL content
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; RecruilerBot/1.0)",
        },
      })
      
      if (!response.ok) {
        return Response.json(
          { error: "URL konnte nicht abgerufen werden" },
          { status: 400 }
        )
      }

      const html = await response.text()
      
      messages = [
        {
          role: "user",
          content: `Analysiere diese Stellenausschreibung und extrahiere alle relevanten Informationen. 
Die Stellenausschreibung ist auf Deutsch oder Englisch.
Antworte IMMER auf Deutsch.

URL: ${url}

HTML Inhalt:
${html.slice(0, 50000)}`, // Limit content length
        },
      ]
    } else if (type === "file" && fileData) {
      // Handle file upload (PDF/DOCX)
      messages = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analysiere diese Stellenausschreibung und extrahiere alle relevanten Informationen.
Die Stellenausschreibung ist auf Deutsch oder Englisch.
Antworte IMMER auf Deutsch.
Dateiname: ${fileName}`,
            },
            {
              type: "file",
              data: fileData,
              mediaType: mimeType || "application/pdf",
              filename: fileName || "document.pdf",
            },
          ],
        },
      ]
    } else if (type === "text" && content) {
      // Handle plain text input
      messages = [
        {
          role: "user",
          content: `Analysiere diese Stellenausschreibung und extrahiere alle relevanten Informationen.
Die Stellenausschreibung ist auf Deutsch oder Englisch.
Antworte IMMER auf Deutsch.

Stellenausschreibung:
${content}`,
        },
      ]
    } else {
      return Response.json(
        { error: "Ungültige Anfrage" },
        { status: 400 }
      )
    }

    const { output } = await generateText({
      model: google("gemini-2.0-flash"),
      system: `Du bist ein Experte für HR und Recruiting. 
Deine Aufgabe ist es, Stellenausschreibungen zu analysieren und strukturierte Daten zu extrahieren.
Extrahiere alle relevanten Informationen und fülle die Felder so vollständig wie möglich aus.
Wenn eine Information nicht vorhanden ist, setze den Wert auf null oder ein leeres Array.
Antworte IMMER auf Deutsch.`,
      output: Output.object({
        schema: jobSchema,
      }),
      messages,
    })

    return Response.json({
      success: true,
      data: {
        title: output?.title || "",
        company: output?.company || "",
        location: output?.location || "",
        employmentType: output?.employmentType || "full-time",
        salaryRange: output?.salaryRange || "",
        description: output?.description || "",
        requiredSkills: output?.requiredSkills || [],
        niceToHaveSkills: output?.niceToHaveSkills || [],
        yearsExperience: output?.yearsExperience || "",
        education: output?.education || "",
        languages: output?.languages || [],
      },
    })
  } catch (error) {
    console.error("[Job Parse Error]", error)
    return Response.json(
      { error: "Fehler bei der Analyse der Stellenausschreibung" },
      { status: 500 }
    )
  }
}
