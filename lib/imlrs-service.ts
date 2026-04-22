import { generateText, Output } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { z } from "zod"

// Create Google Gemini provider
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

// IMLRS 9-Categories Schema
const imlrsMatchSchema = z.object({
  hardSkills: z.number().describe("Score 0-100 for technical/hard skills match (25% weight)"),
  experience: z.number().describe("Score 0-100 for years and relevance of experience (20% weight)"),
  education: z.number().describe("Score 0-100 for educational background match (10% weight)"),
  softSkills: z.number().describe("Score 0-100 for soft skills and communication (10% weight)"),
  languages: z.number().describe("Score 0-100 for language proficiency match (5% weight)"),
  location: z.number().describe("Score 0-100 for location/remote preference match (5% weight)"),
  industry: z.number().describe("Score 0-100 for industry/domain experience (10% weight)"),
  salary: z.number().describe("Score 0-100 for salary expectations alignment (5% weight) - assume 80 if unknown"),
  culture: z.number().describe("Score 0-100 for culture fit indicators (10% weight)"),
  whyTheyFit: z.array(z.string()).describe("Exactly 3 compelling bullet points explaining WHY this candidate fits"),
  potentialConcerns: z.array(z.string()).nullable().describe("1-2 potential gaps or concerns to address in interview"),
  interviewFocus: z.string().describe("One sentence recommendation on what to focus on in the interview"),
  careerPrognosis: z.enum(["ascending", "stable", "risk"]).describe("Career trajectory"),
  prognosisReason: z.string().describe("Brief reason for the career prognosis"),
})

// IMLRS Weights
const IMLRS_WEIGHTS = {
  hardSkills: 0.25,
  experience: 0.20,
  education: 0.10,
  softSkills: 0.10,
  languages: 0.05,
  location: 0.05,
  industry: 0.10,
  salary: 0.05,
  culture: 0.10,
}

export interface CandidateInput {
  full_name?: string
  name?: string
  job_title?: string
  experience_level?: string
  years_of_experience?: number
  location?: string | null
  skills?: string[]
  education?: string | null
  email?: string | null
  phone?: string | null
  summary_ai?: string | null
  summary?: string | null
}

export interface JobInput {
  title: string
  company: string
  location?: string | null
  employment_type?: string | null
  required_skills?: string[]
  nice_to_have_skills?: string[]
  years_experience?: string | null
  education?: string | null
  description?: string | null
}

export interface IMLRSResult {
  overallScore: number
  categories: {
    hardSkills: { score: number; weight: number; label: string }
    experience: { score: number; weight: number; label: string }
    education: { score: number; weight: number; label: string }
    softSkills: { score: number; weight: number; label: string }
    languages: { score: number; weight: number; label: string }
    location: { score: number; weight: number; label: string }
    industry: { score: number; weight: number; label: string }
    salary: { score: number; weight: number; label: string }
    culture: { score: number; weight: number; label: string }
  }
  whyTheyFit: string[]
  potentialConcerns: string[] | null
  interviewFocus: string
  careerPrognosis: "ascending" | "stable" | "risk"
  prognosisReason: string
}

const systemPrompt = `Du bist das "IMLRS" (Intelligent Multi-Layer Ranking System) von Recruily - ein semantisches KI-Matching-System.

## Die 9 IMLRS Kategorien (Gewichtungen):

### 1. Hard Skills (25%)
- Technische Fähigkeiten, Tools, Frameworks
- SEMANTISCHES MAPPING: "Next.js" → React; "PostgreSQL" → SQL

### 2. Berufserfahrung (20%)
- Jahre der Erfahrung vs. Anforderung
- Relevanz der Positionen

### 3. Ausbildung (10%)
- Akademischer Abschluss vs. Anforderung

### 4. Soft Skills (10%)
- Kommunikation, Teamarbeit, Führung

### 5. Sprachen (5%)
- Sprachkenntnisse vs. Anforderungen

### 6. Standort (5%)
- Standort-Match, Remote-Möglichkeiten

### 7. Branche (10%)
- Branchenerfahrung

### 8. Gehalt (5%)
- Wenn unbekannt: vergib 80 Punkte

### 9. Kultur (10%)
- Unternehmenskultur-Fit

## Contextual Pitch
Generiere 3 SPEZIFISCHE Gründe mit konkreten Details aus dem Lebenslauf.

## Karriere-Prognose
- "ascending": Aufwärtstrend
- "stable": Konsistent
- "risk": Lücken, häufige Wechsel

Antworte auf Deutsch.`

export async function calculateIMLRSMatch(
  candidate: CandidateInput,
  job: JobInput
): Promise<IMLRSResult | null> {
  try {
    const candidateInfo = `
=== KANDIDAT ===
Name: ${candidate.full_name || candidate.name}
Position: ${candidate.job_title || "Nicht angegeben"}
Erfahrungslevel: ${candidate.experience_level || "Nicht angegeben"}
Jahre Erfahrung: ${candidate.years_of_experience || "Nicht angegeben"}
Standort: ${candidate.location || "Nicht angegeben"}
Skills: ${(candidate.skills || []).join(", ") || "Keine"}
Ausbildung: ${candidate.education || "Nicht angegeben"}
Zusammenfassung: ${candidate.summary_ai || candidate.summary || "Keine"}
`

    const jobInfo = `
=== STELLE ===
Jobtitel: ${job.title}
Unternehmen: ${job.company}
Standort: ${job.location || "Nicht angegeben"}
Required Skills: ${(job.required_skills || []).join(", ") || "Keine"}
Nice-to-Have: ${(job.nice_to_have_skills || []).join(", ") || "Keine"}
Erfahrung: ${job.years_experience || "Nicht angegeben"}
Ausbildung: ${job.education || "Nicht angegeben"}
Beschreibung: ${job.description || "Keine"}
`

    const { output } = await generateText({
      model: google("gemini-2.5-flash"),
      output: Output.object({
        schema: imlrsMatchSchema,
      }),
      system: systemPrompt,
      prompt: `IMLRS-Analyse:\n\n${candidateInfo}\n\n${jobInfo}`,
    })

    if (!output) {
      return null
    }

    const overallScore = Math.round(
      output.hardSkills * IMLRS_WEIGHTS.hardSkills +
      output.experience * IMLRS_WEIGHTS.experience +
      output.education * IMLRS_WEIGHTS.education +
      output.softSkills * IMLRS_WEIGHTS.softSkills +
      output.languages * IMLRS_WEIGHTS.languages +
      output.location * IMLRS_WEIGHTS.location +
      output.industry * IMLRS_WEIGHTS.industry +
      output.salary * IMLRS_WEIGHTS.salary +
      output.culture * IMLRS_WEIGHTS.culture
    )

    return {
      overallScore,
      categories: {
        hardSkills: { score: output.hardSkills, weight: 25, label: "Hard Skills" },
        experience: { score: output.experience, weight: 20, label: "Erfahrung" },
        education: { score: output.education, weight: 10, label: "Ausbildung" },
        softSkills: { score: output.softSkills, weight: 10, label: "Soft Skills" },
        languages: { score: output.languages, weight: 5, label: "Sprachen" },
        location: { score: output.location, weight: 5, label: "Standort" },
        industry: { score: output.industry, weight: 10, label: "Branche" },
        salary: { score: output.salary, weight: 5, label: "Gehalt" },
        culture: { score: output.culture, weight: 10, label: "Kultur" },
      },
      whyTheyFit: output.whyTheyFit,
      potentialConcerns: output.potentialConcerns,
      interviewFocus: output.interviewFocus,
      careerPrognosis: output.careerPrognosis,
      prognosisReason: output.prognosisReason,
    }
  } catch (error) {
    console.error("IMLRS calculation error:", error)
    return null
  }
}
