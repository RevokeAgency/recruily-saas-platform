import { generateText, Output } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

// Create Google Gemini provider with API key from environment
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

// --- URL import helpers -----------------------------------------------------

// Strip an HTML document down to readable text. Job boards ship huge
// script/style payloads; sending raw HTML to the model buries the actual
// posting, so we reduce to text first.
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<head[\s\S]*?<\/head>/gi, " ")
    .replace(/<(nav|footer|header|aside)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

// Job boards embed schema.org JobPosting JSON-LD for Google for Jobs — the
// most reliable source for title/company/location/description by far.
function findJobPosting(node: unknown): Record<string, unknown> | null {
  if (!node || typeof node !== "object") return null
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findJobPosting(item)
      if (found) return found
    }
    return null
  }
  const obj = node as Record<string, unknown>
  const type = obj["@type"]
  if (type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting"))) return obj
  if (obj["@graph"]) return findJobPosting(obj["@graph"])
  return null
}

function extractJobPostingJsonLd(html: string): string | null {
  const blocks = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )
  for (const match of blocks) {
    try {
      const posting = findJobPosting(JSON.parse(match[1]))
      if (posting) {
        // The description field is usually HTML — reduce it to text.
        if (typeof posting.description === "string") {
          posting.description = htmlToText(posting.description)
        }
        return JSON.stringify(posting)
      }
    } catch {
      // ignore malformed JSON-LD blocks and keep scanning
    }
  }
  return null
}

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "de-AT,de;q=0.9,en;q=0.8",
}

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
    // Job import is an authenticated feature (only used from the job wizard);
    // the endpoint spends AI tokens, so it must not be open to the internet.
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: "Nicht angemeldet" }, { status: 401 })
    }

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
      // Fetch the page like a browser — job boards block obvious bots.
      let response: globalThis.Response
      try {
        response = await fetch(url, {
          headers: BROWSER_HEADERS,
          signal: AbortSignal.timeout(15000),
        })
      } catch {
        return Response.json(
          { error: "Die Seite konnte nicht geladen werden. Kopiere alternativ den Text der Anzeige oder lade sie als PDF hoch." },
          { status: 400 }
        )
      }

      if (!response.ok) {
        return Response.json(
          { error: `Die Seite konnte nicht geladen werden (HTTP ${response.status}). Manche Job-Portale blockieren automatische Zugriffe. Kopiere alternativ den Text der Anzeige oder lade sie als PDF hoch.` },
          { status: 400 }
        )
      }

      const html = await response.text()

      // Prefer the schema.org JobPosting JSON-LD that job boards embed for
      // Google for Jobs; fall back to the page reduced to readable text.
      const jsonLd = extractJobPostingJsonLd(html)
      const pageText = jsonLd ?? htmlToText(html).slice(0, 60000)

      if (!jsonLd && pageText.length < 200) {
        return Response.json(
          { error: "Auf dieser Seite wurde kein lesbarer Anzeigentext gefunden (die Seite wird vermutlich erst im Browser aufgebaut). Kopiere den Text der Anzeige oder lade sie als PDF hoch." },
          { status: 400 }
        )
      }

      messages = [
        {
          role: "user",
          content: `Analysiere diese Stellenausschreibung und extrahiere alle relevanten Informationen.
Die Stellenausschreibung ist auf Deutsch oder Englisch.
Antworte IMMER auf Deutsch.

URL: ${url}

${jsonLd ? "Strukturierte Daten der Stellenausschreibung (schema.org JobPosting):" : "Textinhalt der Seite:"}
${pageText}`,
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
      model: google("gemini-2.5-flash"),
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
