import { NextResponse } from "next/server"
import { generateText, Output } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { z } from "zod"

// Create Google Gemini provider
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

// Schema for the match result
const matchResultSchema = z.object({
  // Weighted scores based on Recruily Matrix
  hardSkillsScore: z.number().describe("Score 0-100 for hard skills match (50% weight)"),
  experienceLevelScore: z.number().describe("Score 0-100 for experience/seniority level match (30% weight)"),
  softSkillsBenefitsScore: z.number().describe("Score 0-100 for soft skills, culture fit, benefits alignment (20% weight)"),
  
  // The contextual pitch - why this candidate fits
  whyTheyFit: z.array(z.string()).describe("Exactly 3 bullet points explaining why this candidate is a good fit"),
  
  // Additional insights
  potentialConcerns: z.array(z.string()).nullable().describe("Any potential concerns or gaps"),
  interviewFocus: z.string().describe("What to focus on in the interview"),
})

export async function POST(request: Request) {
  try {
    const { candidate, job } = await request.json()

    if (!candidate || !job) {
      return NextResponse.json(
        { error: "Missing candidate or job data" },
        { status: 400 }
      )
    }

    const systemPrompt = `Du bist der "Recruily Godlike Matcher" - ein semantisches Matching-System für Recruiting.

Deine Aufgabe ist es, einen Kandidaten mit einer Stellenausschreibung zu vergleichen und einen detaillierten Match-Score zu berechnen.

## Die 3 Säulen des Matchings:

### 1. Hard Skills (50% Gewichtung)
- Vergleiche die geforderten Skills mit den Kandidaten-Skills
- WICHTIG: Nutze SEMANTISCHES Mapping! 
  - Ein Kandidat mit "Next.js" und "TypeScript" hat hohe Übereinstimmung für einen "React" Job
  - "PostgreSQL" Erfahrung ist relevant für "SQL" Anforderungen
  - "AWS" passt zu "Cloud" Anforderungen
- Bewerte nicht nur exakte Matches, sondern auch verwandte Technologien

### 2. Experience Level (30% Gewichtung)
- Passt die Senioritätsstufe des Kandidaten zur Stelle?
- Junior (0-2 Jahre), Mid (3-5 Jahre), Senior (6+ Jahre)
- Berücksichtige die Branchenerfahrung

### 3. Soft Skills & Benefits (20% Gewichtung)
- Standort-Präferenzen (Remote/vor Ort)
- Kulturelle Passung basierend auf dem Lebenslauf
- Sprachkenntnisse wenn relevant

## Der "Contextual Pitch"
Das wichtigste Feature: Generiere 3 prägnante Bullet-Points, die erklären WARUM dieser Kandidat passt.
Beispiel: "Bringt genau die geforderten Cloud-Kenntnisse aus seiner Zeit bei Firma X mit."

Antworte immer auf Deutsch.`

    const candidateInfo = `
KANDIDAT:
- Name: ${candidate.full_name || candidate.name}
- Aktuelle Position: ${candidate.job_title || "Nicht angegeben"}
- Erfahrungslevel: ${candidate.experience_level || candidate.experience || "Nicht angegeben"}
- Jahre Erfahrung: ${candidate.years_of_experience || "Nicht angegeben"}
- Standort: ${candidate.location || "Nicht angegeben"}
- Skills: ${(candidate.skills || []).join(", ")}
- Ausbildung: ${candidate.education || "Nicht angegeben"}
- Zusammenfassung: ${candidate.summary_ai || candidate.summary || "Keine Zusammenfassung verfügbar"}
`

    const jobInfo = `
JOB:
- Titel: ${job.title}
- Unternehmen: ${job.company}
- Standort: ${job.location || "Nicht angegeben"}
- Beschäftigungsart: ${job.employment_type || "Vollzeit"}
- Geforderte Skills: ${(job.required_skills || []).join(", ")}
- Nice-to-have Skills: ${(job.nice_to_have_skills || []).join(", ")}
- Erfahrung benötigt: ${job.years_experience || "Nicht angegeben"}
- Ausbildung: ${job.education || "Nicht angegeben"}
- Beschreibung: ${job.description || "Keine Beschreibung"}
`

    const { output } = await generateText({
      model: google("gemini-2.5-flash"),
      output: Output.object({
        schema: matchResultSchema,
      }),
      system: systemPrompt,
      prompt: `Analysiere diesen Kandidaten für die folgende Stelle und berechne den Match-Score:\n\n${candidateInfo}\n\n${jobInfo}`,
    })

    if (!output) {
      return NextResponse.json(
        { error: "Failed to generate match result" },
        { status: 500 }
      )
    }

    // Calculate overall score using the Recruily Matrix weights
    const overallScore = Math.round(
      output.hardSkillsScore * 0.5 +
      output.experienceLevelScore * 0.3 +
      output.softSkillsBenefitsScore * 0.2
    )

    return NextResponse.json({
      success: true,
      match: {
        overallScore,
        hardSkillsScore: output.hardSkillsScore,
        experienceLevelScore: output.experienceLevelScore,
        softSkillsBenefitsScore: output.softSkillsBenefitsScore,
        whyTheyFit: output.whyTheyFit,
        potentialConcerns: output.potentialConcerns,
        interviewFocus: output.interviewFocus,
      },
    })
  } catch (error) {
    console.error("Match API Error:", error)
    return NextResponse.json(
      { error: "Failed to calculate match" },
      { status: 500 }
    )
  }
}
