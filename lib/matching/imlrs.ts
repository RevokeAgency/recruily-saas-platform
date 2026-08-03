import { generateText, Output } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { z } from "zod"
import { generateDossier, renderDossier, type CareerDossier } from "./dossier"
import { computeHardFacts, renderHardFacts, hardFactCaps, type HardFacts } from "./hard-facts"

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

// Judge + verifier run on the strongest model (ops-overridable without deploy).
const JUDGE_MODEL = process.env.IMLRS_JUDGE_MODEL || "gemini-2.5-pro"

// ─────────────────────────────────────────────────────────────────────────────
// IMLRS 2.0 — evidence-based matching pipeline.
//
//   Stage A  Dossier: full CV text → structured career dossier (cached).
//   Stage B  Hard facts: skill coverage, years, languages — deterministic.
//   Stage C  Judge: strict rubric, Begründung BEFORE score, mandatory
//            evidence citations, per-category confidence. Temperature 0.
//   Stage D  Verifier: independent second model pass reviews every score
//            against rubric + evidence (Vier-Augen-Prinzip).
//   Code     Aggregation: verifier corrections bounded, hard-fact caps
//            applied, weighted sum computed deterministically.
//
// The result carries the full reasoning trail (detail) for explainability.
// ─────────────────────────────────────────────────────────────────────────────

const KONFIDENZ = z.enum(["hoch", "mittel", "niedrig"])

// Field order is deliberate: the model must write evidence and reasoning
// BEFORE it may emit a number (chain-of-thought enforced by schema order).
const categoryJudgment = z.object({
  belege: z.array(z.string()).describe("Wörtliche Belege aus Dossier/Hard-Facts, die die Bewertung stützen (1-3). Leer NUR wenn nichts belegt ist"),
  begruendung: z.string().describe("2-3 Sätze Abwägung: Was spricht dafür, was dagegen — ERST argumentieren, DANN bewerten"),
  konfidenz: KONFIDENZ.describe("hoch = klar belegt; mittel = teilweise belegt; niedrig = kaum/nicht belegt (im Interview klären)"),
  score: z.number().describe("0-100 gemäß der strengen Rubrik, konsistent mit Begründung und Belegen"),
})

const judgeSchema = z.object({
  hardSkills: categoryJudgment,
  experience: categoryJudgment,
  education: categoryJudgment,
  softSkills: categoryJudgment,
  languages: categoryJudgment,
  location: categoryJudgment,
  industry: categoryJudgment,
  salary: categoryJudgment,
  culture: categoryJudgment,
  whyTheyFit: z.array(z.string()).describe("Genau 3 spezifische, belegte Gründe, warum der Kandidat passt"),
  potentialConcerns: z.array(z.string()).nullable().describe("1-3 konkrete Lücken/Risiken für das Interview"),
  interviewFocus: z.string().describe("Ein Satz: worauf sich das Interview konzentrieren sollte"),
  careerPrognosis: z.enum(["ascending", "stable", "risk"]).describe("Karriereverlauf laut Dossier-Trajektorie und Stationen"),
  prognosisReason: z.string().describe("Kurze belegte Begründung der Prognose"),
  knockoutResults: z.array(z.object({
    criterion: z.string().describe("Der exakte Wortlaut des geprüften KO-Kriteriums"),
    failed: z.boolean().describe("true NUR wenn eindeutig belegbar ist, dass der Kandidat dieses Muss-Kriterium NICHT erfüllt. Bei Unklarheit: false"),
    reason: z.string().describe("Kurze Begründung auf Deutsch"),
  })).describe("Bewertung jedes KO-Kriteriums. Leeres Array, wenn keine vorgegeben"),
})

const CATEGORY_KEYS = [
  "hardSkills", "experience", "education", "softSkills", "languages",
  "location", "industry", "salary", "culture",
] as const
export type CategoryKey = (typeof CATEGORY_KEYS)[number]

// Tenant weight overrides come from the nightly calibration job (bounded to
// ±5 pp there). This gate re-validates before use — malformed or out-of-bound
// data silently falls back to the defaults.
function sanitizeWeights(w: unknown): Record<CategoryKey, number> | null {
  if (!w || typeof w !== "object") return null
  const rec = w as Record<string, unknown>
  const out = {} as Record<CategoryKey, number>
  let sum = 0
  for (const key of CATEGORY_KEYS) {
    const v = rec[key]
    if (typeof v !== "number" || !Number.isFinite(v)) return null
    if (v < 0.01 || v > 0.5) return null
    if (Math.abs(v - IMLRS_WEIGHTS[key]) > 0.06) return null // bound + rounding slack
    out[key] = v
    sum += v
  }
  if (Math.abs(sum - 1) > 0.02) return null
  return out
}

const verifierSchema = z.object({
  reviews: z.array(z.object({
    category: z.enum(CATEGORY_KEYS),
    begruendung: z.string().describe("Kurze Prüf-Begründung: Ist der Score durch Belege und Rubrik gedeckt?"),
    urteil: z.enum(["bestätigt", "zu_hoch", "zu_niedrig"]),
    korrigierterScore: z.number().describe("Der korrekte Score laut Rubrik. Bei 'bestätigt' identisch mit dem geprüften Score"),
  })).describe("Prüfung ALLER 9 Kategorien"),
  gesamtanmerkung: z.string().describe("1-2 Sätze Gesamturteil der Prüfung"),
})

// IMLRS weights (unchanged for continuity with stored data).
const IMLRS_WEIGHTS: Record<CategoryKey, number> = {
  hardSkills: 0.25,
  experience: 0.2,
  education: 0.1,
  softSkills: 0.1,
  languages: 0.05,
  location: 0.05,
  industry: 0.1,
  salary: 0.05,
  culture: 0.1,
}

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  hardSkills: "Hard Skills",
  experience: "Erfahrung",
  education: "Ausbildung",
  softSkills: "Soft Skills",
  languages: "Sprachen",
  location: "Standort",
  industry: "Branche",
  salary: "Gehalt",
  culture: "Kultur",
}

export interface IMLRSCandidateInput {
  id?: string
  name?: string
  full_name?: string
  job_title?: string
  skills?: string[]
  experience?: string
  experienceLevel?: string
  experience_level?: string
  years_of_experience?: number
  education?: string | null
  location?: string | null
  email?: string
  phone?: string
  summary?: string
  summary_ai?: string
  cover_letter_text?: string | null
  /** Full CV text — unlocks the real dossier (IMLRS 2.0). */
  resume_text?: string | null
  /** Cached dossier from a previous run — skips Stage A entirely. */
  dossier?: CareerDossier | null
}

export interface IMLRSJobInput {
  id?: string
  title: string
  company: string
  required_skills?: string[] | null
  nice_to_have_skills?: string[] | null
  years_experience?: string | null
  education?: string | null
  location?: string | null
  employment_type?: string
  description?: string | null
  languages?: string[] | null
  ko_criteria?: string[] | null
}

export interface CategoryDetail {
  begruendung: string
  belege: string[]
  konfidenz: "hoch" | "mittel" | "niedrig"
  /** Score as the judge saw it, before verifier + caps (audit trail). */
  rohScore: number
  verifier?: { urteil: string; begruendung: string }
  capped?: boolean
}

export interface IMLRSMatchDetail {
  engine: "imlrs-2"
  categories: Record<CategoryKey, CategoryDetail>
  hardFacts: HardFacts
  verifierNote: string
  dossierSummary: string
  /** Which weight profile aggregated the overall score (audit trail). */
  weightsSource: "standard" | "kunden-kalibriert"
  weightsUsed: Record<CategoryKey, number>
}

export interface IMLRSMatchResult {
  overallScore: number
  categories: Record<CategoryKey, { score: number; weight: number; label: string }>
  whyTheyFit: string[]
  potentialConcerns: string[] | null
  interviewFocus: string
  careerPrognosis: "ascending" | "stable" | "risk"
  prognosisReason: string
  knockout: boolean
  knockoutReasons: string[]
  knockoutResults: { criterion: string; failed: boolean; reason: string }[]
  detail: IMLRSMatchDetail
  /** Freshly built dossier (when Stage A ran) — caller should persist it. */
  dossier: CareerDossier | null
}

const judgeSystemPrompt = `Du bist der Bewertungs-Richter des IMLRS 2.0 (Intelligent Multi-Layer Ranking System) von Revetly — ein Eignungsdiagnostiker auf Enterprise-Niveau.

## Arbeitsweise (nicht verhandelbar)
1. Du bewertest AUSSCHLIESSLICH auf Basis des Dossiers und der deterministisch geprüften Hard Facts. Was dort nicht steht, existiert nicht.
2. Für jede Kategorie: ERST Belege zitieren, DANN abwägen (dafür/dagegen), DANN Konfidenz, ERST ZULETZT der Score.
3. Fehlende Information wird NIE wohlwollend geraten. Unbelegtes → Konfidenz "niedrig" und neutral-vorsichtiger Score (50-65), mit Hinweis fürs Interview.
4. Die Hard Facts sind bindend: Widersprich der Skill-Deckung und den Erfahrungszahlen nicht — interpretiere sie.

## Strenge Rubrik (gilt für JEDE Kategorie)
- 90-100  Außergewöhnlich: Anforderung klar übertroffen, mehrfach stark belegt. SELTEN — im typischen Bewerberfeld < 10 %.
- 75-89   Sehr gut: Anforderung voll erfüllt, solide belegt.
- 60-74   Solide: erfüllt mit erkennbaren Lücken oder dünner Beleglage.
- 40-59   Deutliche Lücken: Anforderung nur teilweise erfüllt.
- 0-39    Unpassend: Anforderung verfehlt.
Kalibrierung: Sei streng und differenziert. Ein Gesamtbild über 80 bedeutet "sofort einladen" — das trifft auf die wenigsten zu. Nutze die ganze Skala.

## Kategorien-Hinweise
- Hard Skills (25 %): Deckungsgrad laut Hard Facts + TIEFE laut Dossier (erwähnt < angewendet < vertieft).
- Erfahrung (20 %): Jahre laut Hard Facts + Relevanz und Seniorität der Stationen + Lücken.
- Ausbildung (10 %), Soft Skills (10 %), Sprachen (5 %), Standort (5 %), Branche (10 %), Gehalt (5 %; unbelegt → 60, Konfidenz niedrig), Kultur (10 %).

## KO-Kriterien
Prüfe jedes vorgegebene KO-Kriterium einzeln und KONSERVATIV: "failed" nur bei eindeutigem Beleg der Nicht-Erfüllung. Unklar → nicht ausschließen, im Interview klären.

Antworte IMMER auf Deutsch.`

const verifierSystemPrompt = `Du bist die unabhängige Prüfinstanz des IMLRS 2.0 — ein zweiter, kritischer Eignungsdiagnostiker (Vier-Augen-Prinzip).

Du erhältst Dossier, Hard Facts und die Bewertung des Richters. Prüfe JEDE der 9 Kategorien:
- Ist der Score durch die zitierten Belege gedeckt?
- Entspricht er der strengen Rubrik? (90-100 außergewöhnlich/selten; 75-89 voll erfüllt; 60-74 solide mit Lücken; 40-59 deutliche Lücken; 0-39 unpassend)
- Typische Fehler, auf die du achtest: Score-Inflation ohne Belege, Ignorieren der Hard Facts, wohlwollendes Raten bei fehlender Information, Halo-Effekt einer starken Kategorie auf andere.

Urteil "bestätigt" nur, wenn Score und Beleglage zusammenpassen. Sonst "zu_hoch"/"zu_niedrig" mit korrigiertem Score laut Rubrik. Antworte auf Deutsch.`

function renderJob(job: IMLRSJobInput): string {
  return `=== STELLE ===
Titel: ${job.title}
Unternehmen: ${job.company}
Standort: ${job.location || "Nicht angegeben"}
Beschäftigungsart: ${job.employment_type || "Vollzeit"}
Muss-Skills: ${(job.required_skills || []).join(", ") || "Keine definiert"}
Nice-to-have: ${(job.nice_to_have_skills || []).join(", ") || "Keine"}
Erfahrung: ${job.years_experience || "Nicht angegeben"}
Ausbildung: ${job.education || "Nicht angegeben"}
Sprachen: ${(job.languages || []).join(", ") || "Keine angegeben"}
${(job.ko_criteria && job.ko_criteria.length > 0)
  ? `KO-Kriterien (harte Muss-Anforderungen, einzeln prüfen):\n${job.ko_criteria.map((k) => `- ${k}`).join("\n")}`
  : "KO-Kriterien: Keine vorgegeben"}
Beschreibung: ${(job.description || "Keine").slice(0, 4000)}`
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

// Soft evidence check: a citation should actually occur in the material the
// judge was shown. Unverifiable evidence downgrades confidence (never crashes).
function evidenceSupported(evidence: string, haystack: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim()
  const e = normalize(evidence)
  if (e.length < 12) return true // too short to verify meaningfully
  return normalize(haystack).includes(e.slice(0, 40))
}

/**
 * Runs the full IMLRS 2.0 pipeline for a candidate-job pair.
 * Same call signature as v1 — existing callers upgrade automatically.
 */
export async function runIMLRSMatch(
  candidate: IMLRSCandidateInput,
  job: IMLRSJobInput,
  opts?: { weights?: Record<string, number> | null },
): Promise<IMLRSMatchResult> {
  const tenantWeights = sanitizeWeights(opts?.weights)
  const weights: Record<CategoryKey, number> = tenantWeights ?? IMLRS_WEIGHTS
  // ── Stage A: dossier (reuse cache when provided) ──────────────────────────
  let dossier: CareerDossier | null = candidate.dossier ?? null
  let dossierIsFresh = false
  if (!dossier) {
    try {
      dossier = await generateDossier({
        resumeText: candidate.resume_text,
        coverLetterText: candidate.cover_letter_text,
        fullName: candidate.full_name || candidate.name,
        jobTitle: candidate.job_title,
        skills: candidate.skills,
        yearsOfExperience: candidate.years_of_experience,
        education: candidate.education,
        location: candidate.location,
        summaryAi: candidate.summary_ai || candidate.summary,
      })
      dossierIsFresh = true
    } catch (err) {
      console.error("[imlrs2] dossier failed, judging from structured fields:", err)
    }
  }

  // ── Stage B: deterministic hard facts ─────────────────────────────────────
  const hardFacts = await computeHardFacts({
    dossier,
    candidateSkills: candidate.skills || [],
    candidateLocation: candidate.location,
    job,
  })

  const dossierText = dossier
    ? renderDossier(dossier)
    : `KEIN DOSSIER VERFÜGBAR — nur Strukturdaten:
Name: ${candidate.full_name || candidate.name || "?"} · Position: ${candidate.job_title || "?"} · ${candidate.years_of_experience ?? "?"} Jahre
Skills: ${(candidate.skills || []).join(", ") || "keine"} · Ausbildung: ${candidate.education || "?"} · Standort: ${candidate.location || "?"}
Zusammenfassung: ${candidate.summary_ai || candidate.summary || "—"}`
  const hardFactsText = renderHardFacts(hardFacts)
  const jobText = renderJob(job)
  const coverText = candidate.cover_letter_text?.trim()
    ? `\n=== ANSCHREIBEN (für Soft Skills / Kultur / Motivation) ===\n${candidate.cover_letter_text.trim().slice(0, 4000)}`
    : ""

  // ── Stage C: judge ────────────────────────────────────────────────────────
  const { output: judged } = await generateText({
    model: google(JUDGE_MODEL),
    temperature: 0,
    output: Output.object({ schema: judgeSchema }),
    system: judgeSystemPrompt,
    prompt: `Bewerte dieses Kandidaten-Job-Paar nach der strengen Rubrik.\n\n=== KARRIERE-DOSSIER ===\n${dossierText}\n\n=== HARD FACTS (deterministisch, bindend) ===\n${hardFactsText}${coverText}\n\n${jobText}`,
  })
  if (!judged) throw new Error("IMLRS judge failed")

  // ── Stage D: independent verifier ─────────────────────────────────────────
  let verifierNote = "Prüfung nicht verfügbar — Richter-Scores unverändert übernommen."
  const verifierReviews = new Map<CategoryKey, { urteil: string; begruendung: string; korrigierterScore: number }>()
  try {
    const judgedRendered = CATEGORY_KEYS
      .map((k) => `${CATEGORY_LABELS[k]} (${k}): ${judged[k].score}/100, Konfidenz ${judged[k].konfidenz}\n  Belege: ${judged[k].belege.join(" | ") || "KEINE"}\n  Begründung: ${judged[k].begruendung}`)
      .join("\n")
    const { output: verified } = await generateText({
      model: google(JUDGE_MODEL),
      temperature: 0,
      output: Output.object({ schema: verifierSchema }),
      system: verifierSystemPrompt,
      prompt: `=== KARRIERE-DOSSIER ===\n${dossierText}\n\n=== HARD FACTS ===\n${hardFactsText}\n\n${jobText}\n\n=== ZU PRÜFENDE BEWERTUNG ===\n${judgedRendered}`,
    })
    if (verified) {
      verifierNote = verified.gesamtanmerkung
      for (const r of verified.reviews) verifierReviews.set(r.category, r)
    }
  } catch (err) {
    console.error("[imlrs2] verifier failed, keeping judge scores:", err)
  }

  // ── Deterministic aggregation: verifier (bounded) + hard-fact caps ────────
  const caps = hardFactCaps(hardFacts)
  const evidenceHaystack = `${dossierText}\n${hardFactsText}`

  const categories = {} as IMLRSMatchResult["categories"]
  const detailCategories = {} as IMLRSMatchDetail["categories"]

  for (const key of CATEGORY_KEYS) {
    const j = judged[key]
    let score = clamp(Math.round(j.score), 0, 100)
    const detail: CategoryDetail = {
      begruendung: j.begruendung,
      belege: j.belege,
      konfidenz: j.konfidenz,
      rohScore: score,
    }

    // Verifier corrections, bounded to ±15 so a runaway review can't flip a score.
    const review = verifierReviews.get(key)
    if (review && review.urteil !== "bestätigt") {
      score = clamp(Math.round(review.korrigierterScore), score - 15, score + 15)
      score = clamp(score, 0, 100)
      detail.verifier = { urteil: review.urteil, begruendung: review.begruendung }
    }

    // Hard-fact ceilings — no prompt can override arithmetic.
    if (key === "hardSkills" && score > caps.hardSkillsCap) { score = caps.hardSkillsCap; detail.capped = true }
    if (key === "experience" && score > caps.experienceCap) { score = caps.experienceCap; detail.capped = true }

    // Unverifiable evidence → confidence can only go down.
    if (detail.belege.length > 0 && !detail.belege.some((b) => evidenceSupported(b, evidenceHaystack))) {
      detail.konfidenz = "niedrig"
    }

    categories[key] = { score, weight: Math.round(weights[key] * 100), label: CATEGORY_LABELS[key] }
    detailCategories[key] = detail
  }

  const overallScore = Math.round(
    CATEGORY_KEYS.reduce((sum, key) => sum + categories[key].score * weights[key], 0),
  )

  // KO: only criteria the job actually defined count (model can't invent KOs).
  const definedKo = job.ko_criteria || []
  const koResults =
    definedKo.length === 0
      ? []
      : (judged.knockoutResults || []).filter((r) =>
          definedKo.some((k) => k.trim().toLowerCase() === r.criterion.trim().toLowerCase()),
        )

  return {
    overallScore,
    categories,
    whyTheyFit: judged.whyTheyFit,
    potentialConcerns: judged.potentialConcerns,
    interviewFocus: judged.interviewFocus,
    careerPrognosis: judged.careerPrognosis,
    prognosisReason: judged.prognosisReason,
    knockout: koResults.some((r) => r.failed),
    knockoutReasons: koResults.filter((r) => r.failed).map((r) => `${r.criterion}: ${r.reason}`),
    knockoutResults: koResults,
    detail: {
      engine: "imlrs-2",
      categories: detailCategories,
      hardFacts,
      verifierNote,
      dossierSummary: dossier?.summary ?? "Kein Dossier — Bewertung auf Basis der Strukturdaten.",
      weightsSource: tenantWeights ? "kunden-kalibriert" : "standard",
      weightsUsed: weights,
    },
    dossier: dossierIsFresh ? dossier : null,
  }
}
