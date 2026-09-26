import { generateStructured } from "@/lib/ai/generate"
import { z } from "zod"
import { withApplicantTextRule } from "@/lib/ai/applicant-text"
import { checkCoverLetterClaims, type ClaimStatus, type CoverClaim } from "./claims"


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
  /** Gesetzt bei Nachfragen aus dem Abgleich Anschreiben gegen Lebenslauf. */
  quelle?: "anschreiben"
}

/** Ergebnis des Abgleichs, gespeichert im Leitfaden. */
export interface CoverLetterCheck {
  geprueft: number
  belegt: number
  /** Aussagen ohne Beleg oder mit Abweichung, in der Reihenfolge der Dringlichkeit. */
  offen: Array<{ aussage: string; status: Exclude<ClaimStatus, "belegt">; beleg: string | null; hinweis: string }>
}

export interface InterviewGuide {
  focusSummary: string
  questions: InterviewQuestion[]
  anschreibenAbgleich?: CoverLetterCheck
}

/** Text aus den Unterlagen für den Abgleich (bereits ohne versteckten Text). */
export interface GuideDocuments {
  resumeText?: string | null
  coverText?: string | null
}

/** Höchstens so viele Nachfragen aus dem Abgleich, damit der Leitfaden ein Gespräch bleibt. */
const MAX_CLAIM_QUESTIONS = 3

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
  /** IMLRS 2.0 reasoning trail — low-confidence categories become interview targets. */
  match_detail?: {
    categories?: Record<string, { konfidenz?: string; begruendung?: string }>
    dossierSummary?: string
  } | null
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
  documents?: GuideDocuments,
): Promise<InterviewGuide> {
  // Erst der Abgleich, damit der Leitfaden dieselben Themen nicht doppelt
  // fragt. Best-effort: Scheitert er, entsteht der Leitfaden ohne ihn.
  let claims: CoverClaim[] = []
  try {
    const result = await checkCoverLetterClaims({
      resumeText: documents?.resumeText,
      coverText: documents?.coverText,
      jobTitle: job.title,
      requiredSkills: job.required_skills,
    })
    claims = result?.claims ?? []
  } catch (err) {
    console.error("[interview] Abgleich Anschreiben übersprungen:", err)
  }
  // Abweichungen zuerst: Ein Widerspruch ist dringender als eine Lücke.
  const open = claims
    .filter((c) => c.status !== "belegt")
    .sort((a, b) => (a.status === "abweichend" ? 0 : 1) - (b.status === "abweichend" ? 0 : 1))
  const asked = open.slice(0, MAX_CLAIM_QUESTIONS)

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

  // IMLRS 2.0: categories the matcher itself marked as weakly evidenced are
  // explicit interview targets — this is exactly what an interview is for.
  const DETAIL_LABELS: Record<string, string> = {
    hardSkills: "Hard Skills", experience: "Berufserfahrung", education: "Ausbildung",
    softSkills: "Soft Skills", languages: "Sprachen", location: "Standort",
    industry: "Branche", salary: "Gehalt", culture: "Kultur",
  }
  const detailCats = scores.match_detail?.categories ?? {}
  const uncertain = Object.entries(detailCats)
    .filter(([, d]) => d?.konfidenz === "niedrig" || d?.konfidenz === "mittel")
    .map(([key, d]) => `- ${DETAIL_LABELS[key] ?? key} (Konfidenz ${d.konfidenz}): ${d.begruendung ?? ""}`)

  const scoreInfo = `
=== IMLRS-SCORE (nach Kategorie, aufsteigend) ===
${scoreLines || "Keine Kategoriewerte verfügbar"}
Karriere-Prognose: ${scores.career_prognosis || "—"}
${scores.ai_summary ? `Kurzeinschätzung: ${scores.ai_summary}` : ""}
${scores.match_detail?.dossierSummary ? `Dossier-Fazit: ${scores.match_detail.dossierSummary}` : ""}
${uncertain.length ? `\n=== SCHWACH BELEGTE BEREICHE (laut Matching-Prüfung — im Interview klären!) ===\n${uncertain.join("\n")}` : ""}

Die schwächsten/unsichersten Bereiche sind: ${weakest || "—"}. Priorisiere diese im Leitfaden.
`

  const claimInfo = asked.length
    ? `
=== BEREITS ERGÄNZT: NACHFRAGEN ZUM ANSCHREIBEN ===
Diese Fragen kommen separat in den Leitfaden. Frag die folgenden Themen NICHT noch einmal und erstelle deshalb nur 4–5 eigene Fragen:
${asked.map((c) => `- ${c.aussage}`).join("\n")}
`
    : ""

  const { output } = await generateStructured({
    task: "utility",
    label: "Interviewleitfaden",
    schema: interviewGuideSchema,
    system: withApplicantTextRule(systemPrompt),
    prompt: `Erstelle einen strukturierten Interviewleitfaden für dieses Kandidaten-Job-Paar. Zielge­nau auf die schwachen/unsicheren Score-Bereiche.\n${candidateInfo}\n${jobInfo}\n${scoreInfo}${claimInfo}`,
  })

  if (!output) throw new Error("Failed to generate interview guide")
  if (claims.length === 0) return output

  // Die Begründung stammt aus den geprüften Zitaten, nicht aus freiem
  // Modelltext: So sieht der Recruiter genau, worauf die Frage beruht.
  const claimQuestions: InterviewQuestion[] = asked.map((c) => ({
    competency: "Anschreiben",
    question: c.nachfrage,
    rationale:
      c.status === "abweichend"
        ? `Im Anschreiben steht „${c.aussage}“, im Lebenslauf „${c.beleg}“. ${c.hinweis}`
        : `Im Anschreiben steht „${c.aussage}“. Im Lebenslauf findet sich dazu nichts. ${c.hinweis}`,
    lookFor: c.wofuer,
    weakAnchor: c.schwach,
    strongAnchor: c.stark,
    quelle: "anschreiben",
  }))

  return {
    ...output,
    questions: [...output.questions, ...claimQuestions],
    anschreibenAbgleich: {
      geprueft: claims.length,
      belegt: claims.length - open.length,
      offen: open.map((c) => ({
        aussage: c.aussage,
        status: c.status as Exclude<ClaimStatus, "belegt">,
        beleg: c.beleg,
        hinweis: c.hinweis,
      })),
    },
  }
}
