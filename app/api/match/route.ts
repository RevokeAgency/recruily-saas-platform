import { NextResponse } from "next/server"
import { generateText, Output } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { z } from "zod"

// Create Google Gemini provider
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

// IMLRS 9-Categories Schema according to Recruily Spec
const imlrsMatchSchema = z.object({
  // === IMLRS 9 Categories ===
  hardSkills: z.number().describe("Score 0-100 for technical/hard skills match (25% weight)"),
  experience: z.number().describe("Score 0-100 for years and relevance of experience (20% weight)"),
  education: z.number().describe("Score 0-100 for educational background match (10% weight)"),
  softSkills: z.number().describe("Score 0-100 for soft skills and communication (10% weight)"),
  languages: z.number().describe("Score 0-100 for language proficiency match (5% weight)"),
  location: z.number().describe("Score 0-100 for location/remote preference match (5% weight)"),
  industry: z.number().describe("Score 0-100 for industry/domain experience (10% weight)"),
  salary: z.number().describe("Score 0-100 for salary expectations alignment (5% weight) - assume 80 if unknown"),
  culture: z.number().describe("Score 0-100 for culture fit indicators (10% weight)"),
  
  // === Contextual Analysis ===
  whyTheyFit: z.array(z.string()).describe("Exactly 3 compelling bullet points explaining WHY this candidate fits - be specific with examples from their background"),
  potentialConcerns: z.array(z.string()).nullable().describe("1-2 potential gaps or concerns to address in interview"),
  interviewFocus: z.string().describe("One sentence recommendation on what to focus on in the interview"),
  
  // === Career Prognosis ===
  careerPrognosis: z.enum(["ascending", "stable", "risk"]).describe("Career trajectory: ascending (growing fast), stable (consistent performer), risk (gaps or concerns)"),
  prognosisReason: z.string().describe("Brief reason for the career prognosis"),
})

// IMLRS Weights according to spec
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

export async function POST(request: Request) {
  try {
    const { candidate, job } = await request.json()

    if (!candidate || !job) {
      return NextResponse.json(
        { error: "Missing candidate or job data" },
        { status: 400 }
      )
    }

    const systemPrompt = `Du bist das "IMLRS" (Intelligent Multi-Layer Ranking System) von Recruily - ein semantisches KI-Matching-System der nächsten Generation.

## Deine Mission
Analysiere Kandidaten-Job-Paare mit höchster Präzision über 9 gewichtete Dimensionen.

## Die 9 IMLRS Kategorien (Gewichtungen):

### 1. Hard Skills (25%)
- Technische Fähigkeiten, Tools, Frameworks, Programmiersprachen
- NUTZE SEMANTISCHES MAPPING: "Next.js" → impliziert React; "PostgreSQL" → impliziert SQL; "AWS" → impliziert Cloud
- Bewerte auch verwandte/übertragbare Skills

### 2. Berufserfahrung (20%)
- Jahre der Erfahrung vs. Anforderung
- Relevanz der bisherigen Positionen
- Karriereprogression (Aufstieg in Verantwortung)

### 3. Ausbildung (10%)
- Akademischer Abschluss vs. Anforderung
- Relevanz des Studienfachs
- Zusätzliche Zertifizierungen

### 4. Soft Skills (10%)
- Kommunikationsfähigkeit (erkennbar aus Lebenslauf-Formulierungen)
- Teamarbeit, Führungsqualitäten
- Projektmanagement-Erfahrung

### 5. Sprachen (5%)
- Sprachkenntnisse vs. Anforderungen
- Deutsch/Englisch für DACH-Region besonders relevant
- Business-Level vs. Native

### 6. Standort (5%)
- Übereinstimmung Kandidaten-Standort mit Job-Standort
- Remote-Möglichkeiten
- Umzugsbereitschaft (wenn erkennbar)

### 7. Branche (10%)
- Branchenerfahrung (z.B. FinTech, Healthcare, E-Commerce)
- Übertragbare Domänenkenntnisse
- Verständnis für branchenspezifische Anforderungen

### 8. Gehalt (5%)
- Wenn keine Gehaltsinfo: Vergib 80 Punkte (neutral)
- Bei Mismatch: entsprechend niedriger bewerten

### 9. Kultur (10%)
- Unternehmenskultur-Fit basierend auf Lebenslauf-Signalen
- Arbeitsweise (Startup vs. Konzern Erfahrung)
- Werte-Alignment

## Contextual Pitch (WICHTIG!)
Generiere 3 SPEZIFISCHE Gründe, warum dieser Kandidat passt. Beziehe dich konkret auf Details aus dem Lebenslauf.
SCHLECHT: "Hat relevante Erfahrung"
GUT: "Bringt 4 Jahre React-Erfahrung aus seiner Zeit bei Firma X mit, wo er das Frontend-Team leitete"

## Karriere-Prognose
- "ascending": Klarer Aufwärtstrend, schnelles Wachstum, zunehmende Verantwortung
- "stable": Konsistente Karriere, zuverlässiger Performer
- "risk": Lücken im Lebenslauf, häufige Jobwechsel, Abstieg in Verantwortung

Antworte IMMER auf Deutsch.`

    const candidateInfo = `
=== KANDIDAT ===
Name: ${candidate.full_name || candidate.name}
Aktuelle/Letzte Position: ${candidate.job_title || "Nicht angegeben"}
Erfahrungslevel: ${candidate.experience_level || "Nicht angegeben"}
Jahre Berufserfahrung: ${candidate.years_of_experience || "Nicht angegeben"}
Standort: ${candidate.location || "Nicht angegeben"}
Skills: ${(candidate.skills || []).join(", ") || "Keine Skills angegeben"}
Ausbildung: ${candidate.education || "Nicht angegeben"}
E-Mail: ${candidate.email || "Nicht angegeben"}
Telefon: ${candidate.phone || "Nicht angegeben"}
KI-Zusammenfassung: ${candidate.summary_ai || candidate.summary || "Keine Zusammenfassung verfügbar"}
`

    const jobInfo = `
=== STELLENAUSSCHREIBUNG ===
Jobtitel: ${job.title}
Unternehmen: ${job.company}
Standort: ${job.location || "Nicht angegeben"}
Beschäftigungsart: ${job.employment_type || "Vollzeit"}
Geforderte Skills (Must-Have): ${(job.required_skills || []).join(", ") || "Keine angegeben"}
Nice-to-Have Skills: ${(job.nice_to_have_skills || []).join(", ") || "Keine angegeben"}
Benötigte Erfahrung: ${job.years_experience || "Nicht angegeben"}
Geforderte Ausbildung: ${job.education || "Nicht angegeben"}
Stellenbeschreibung: ${job.description || "Keine Beschreibung verfügbar"}
`

    const { output } = await generateText({
      model: google("gemini-2.5-flash"),
      output: Output.object({
        schema: imlrsMatchSchema,
      }),
      system: systemPrompt,
      prompt: `Führe eine vollständige IMLRS-Analyse für dieses Kandidaten-Job-Paar durch:\n\n${candidateInfo}\n\n${jobInfo}`,
    })

    if (!output) {
      return NextResponse.json(
        { error: "Failed to generate IMLRS match result" },
        { status: 500 }
      )
    }

    // Calculate overall score using IMLRS weights
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

    return NextResponse.json({
      success: true,
      match: {
        overallScore,
        // IMLRS 9 Categories
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
        // Contextual Analysis
        whyTheyFit: output.whyTheyFit,
        potentialConcerns: output.potentialConcerns,
        interviewFocus: output.interviewFocus,
        // Career Prognosis
        careerPrognosis: output.careerPrognosis,
        prognosisReason: output.prognosisReason,
      },
    })
  } catch (error) {
    console.error("IMLRS Match API Error:", error)
    return NextResponse.json(
      { error: "Failed to calculate IMLRS match" },
      { status: 500 }
    )
  }
}
