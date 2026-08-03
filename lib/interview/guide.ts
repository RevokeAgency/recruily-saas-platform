import { generateText, Output } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { z } from "zod"

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

// A single structured-interview question with an anchored rating scale — the
// part that makes structured interviews predictive: every rater judges the same
// question against the same 1↔5 anchors.
const questionSchema = z.object({
  competency: z.string().describe("Die geprüfte Kompetenz/Kategorie, z. B. 'Soft Skills', 'Berufserfahrung', 'Branche'"),
  question: z.string().describe("Die konkrete, verhaltensbasierte Frage auf Deutsch (offen, situativ)"),
  rationale: z.string().describe("Warum diese Frage: der konkrete Score-Schwachpunkt oder die Unsicherheit, die sie klärt (z. B. 'Soft Skills nur mit 55% belegt' oder 'Lücke im Lebenslauf 2023 unklar')"),
  lookFor: z.string().describe("Worauf der Recruiter bei einer starken Antwort achten sollte"),
  weakAnchor: z.string().describe("Wie eine schwache Antwort klingt (Bewertung 1–2)"),
  strongAnchor: z.string().describe("Wie eine starke Antwort klingt (Bewertung 4–5)"),
})

const interviewGuideSchema = z.object({
  focusSummary: z.string().describe("Ein bis zwei Sätze: worauf sich das Interview konzentrieren sollte, basierend auf den unsicheren Score-Bereichen"),
  questions: z.array(questionSchema).describe("5–7 strukturierte Fragen, priorisiert nach den SCHWÄCHSTEN und unsichersten Kategorien des Scores"),
})

export interface InterviewQuestion {
  competency: string
  question: string
  rationale: string
  lookFor: string
  weakAnchor: string
  strongAnchor: string
}

export interface InterviewGuide {
  focusSummary: string
  questions: InterviewQuestion[]
}

export interface GuideCandidateInput {
  full_name?: string | null
  job_title?: string | null
  years_of_experience?: number | null
  experience_level?: string | null
  skills?: string[] | null
  education?: string | null
  location?: string | null
  summary_ai?: string | null
}

export interface GuideJobInput {
  title: string
  company: string
  required_skills?: string[] | null
  nice_to_have_skills?: string[] | null
  years_experience?: string | null
  education?: string | null
  description?: string | null
}

// The 9 IMLRS category scores stored on the link — used to target the weak spots.
export interface GuideScores {
  hard_skills_score?: number | null
  experience_score?: number | null
  education_score?: number | null
  soft_skills_score?: number | null
  languages_score?: number | null
  location_score?: number | null
  industry_score?: number | null
  salary_score?: number | null
  culture_score?: number | null
  career_prognosis?: string | null
  ai_summary?: string | null
}

const CATEGORY_LABELS: Record<string, string> = {
  hard_skills_score: "Hard Skills",
  experience_score: "Berufserfahrung",
  education_score: "Ausbildung",
  soft_skills_score: "Soft Skills",
  languages_score: "Sprachen",
  location_score: "Standort",
  industry_score: "Branche",
  salary_score: "Gehalt",
  culture_score: "Kultur",
}

const systemPrompt = `Du bist ein erfahrener Eignungsdiagnostiker und erstellst STRUKTURIERTE Interviewleitfäden für Recruiter.

Strukturierte Interviews mit festen Fragen und verankerten Bewertungsskalen sagen den Berufserfolg deutlich besser vorher als freie Bauchgefühl-Gespräche. Genau das ist deine Aufgabe.

## Prinzipien
- Konzentriere dich auf die SCHWÄCHSTEN und UNSICHERSTEN Bereiche des Matching-Scores. Was bereits stark belegt ist, muss nicht im Interview geprüft werden.
- Formuliere VERHALTENSBASIERTE / situative Fragen ("Erzählen Sie von einer Situation, in der …"), keine Ja/Nein-Fragen.
- Sprich konkrete Lücken oder Unklarheiten an (z. B. eine unklare Lücke im Lebenslauf, schwach belegte Soft Skills).
- Für jede Frage: eine klare Verankerung, wie eine schwache (1–2) und eine starke (4–5) Antwort klingt. Das ist entscheidend für faire, vergleichbare Bewertungen.
- 5–7 Fragen. Deutsch. Professionell, aber praxisnah.

Antworte IMMER auf Deutsch.`

/**
 * Generates a structured interview guide from a candidate/job pair and the
 * stored IMLRS category scores, prioritising the weakest / most uncertain areas.
 */
export async function generateInterviewGuide(
  candidate: GuideCandidateInput,
  job: GuideJobInput,
  scores: GuideScores,
): Promise<InterviewGuide> {
  // Rank categories by score so the model knows where to dig.
  const scored = Object.entries(CATEGORY_LABELS)
    .map(([key, label]) => ({ label, value: (scores as Record<string, number | null | undefined>)[key] }))
    .filter((c) => typeof c.value === "number")
    .sort((a, b) => (a.value as number) - (b.value as number))

  const scoreLines = scored.map((c) => `- ${c.label}: ${c.value}/100`).join("\n")
  const weakest = scored.slice(0, 3).map((c) => c.label).join(", ")

  const candidateInfo = `
=== KANDIDAT ===
Name: ${candidate.full_name || "Unbekannt"}
Aktuelle/Letzte Position: ${candidate.job_title || "Nicht angegeben"}
Jahre Berufserfahrung: ${candidate.years_of_experience ?? "Nicht angegeben"}
Erfahrungslevel: ${candidate.experience_level || "Nicht angegeben"}
Skills: ${(candidate.skills || []).join(", ") || "Keine angegeben"}
Ausbildung: ${candidate.education || "Nicht angegeben"}
Standort: ${candidate.location || "Nicht angegeben"}
KI-Zusammenfassung: ${candidate.summary_ai || "—"}
`

  const jobInfo = `
=== STELLE ===
Titel: ${job.title}
Unternehmen: ${job.company}
Geforderte Skills: ${(job.required_skills || []).join(", ") || "—"}
Nice-to-have: ${(job.nice_to_have_skills || []).join(", ") || "—"}
Benötigte Erfahrung: ${job.years_experience || "—"}
Geforderte Ausbildung: ${job.education || "—"}
Beschreibung: ${(job.description || "—").slice(0, 1500)}
`

  const scoreInfo = `
=== IMLRS-SCORE (nach Kategorie, aufsteigend) ===
${scoreLines || "Keine Kategoriewerte verfügbar"}
Karriere-Prognose: ${scores.career_prognosis || "—"}
${scores.ai_summary ? `Kurzeinschätzung: ${scores.ai_summary}` : ""}

Die schwächsten/unsichersten Bereiche sind: ${weakest || "—"}. Priorisiere diese im Leitfaden.
`

  const { output } = await generateText({
    model: google("gemini-2.5-flash"),
    output: Output.object({ schema: interviewGuideSchema }),
    system: systemPrompt,
    prompt: `Erstelle einen strukturierten Interviewleitfaden für dieses Kandidaten-Job-Paar. Zielge­nau auf die schwachen/unsicheren Score-Bereiche.\n${candidateInfo}\n${jobInfo}\n${scoreInfo}`,
  })

  if (!output) throw new Error("Failed to generate interview guide")
  return output
}
