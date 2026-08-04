import type { SupabaseClient } from "@supabase/supabase-js"
import { anonymizeText, anonymizeDeep, containsLikelyPii } from "./anonymize"

// ─────────────────────────────────────────────────────────────────────────────
// Sammlung von Trainingsbeispielen für ein eigenes Revetly-Modell.
//
// Zwei Regeln, die den Wert dieser Daten ausmachen:
//
// 1. NUR MENSCHLICHE URTEILE. Auf eigenen KI-Ausgaben zu trainieren wäre
//    Selbst-Destillation: Das Modell zementiert seine Fehler. Gesammelt wird
//    deshalb ausschließlich, wo ein Mensch entschieden hat — strukturiertes
//    Interview, Einstellung, Absage.
//
// 2. NUR MIT EINWILLIGUNG UND OHNE KLARDATEN. Ohne Opt-in des Kunden wird
//    nichts gespeichert; vor dem Speichern wird pseudonymisiert und final
//    gegengeprüft.
// ─────────────────────────────────────────────────────────────────────────────

export type TrainingTask = "dossier" | "judge" | "ranking"
export type LabelSource = "interview" | "hire" | "reject" | "ranking"

interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

/** Hat dieser Kunde dem Modelltraining zugestimmt? Fail-closed. */
export async function hasTrainingConsent(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("ai_training_consent")
    .eq("id", userId)
    .single()
  if (error) return false // Spalte fehlt oder Fehler → im Zweifel NICHT sammeln
  return data?.ai_training_consent === true
}

/**
 * Legt ein Trainingsbeispiel an — pseudonymisiert, mit menschlichem Zielsignal.
 * Best-effort: schlägt es fehl, darf das den Produktivbetrieb nie stören.
 */
export async function recordTrainingExample(
  supabase: SupabaseClient,
  args: {
    userId: string
    task: TrainingTask
    labelSource: LabelSource
    labelStrength?: number | null
    jobCandidateId?: string | null
    /** Klartext-Namen, die zusätzlich maskiert werden sollen. */
    names?: (string | null | undefined)[]
    system: string
    user: string
    assistant: string
  },
): Promise<boolean> {
  try {
    if (!(await hasTrainingConsent(supabase, args.userId))) return false

    const names = args.names ?? []
    const messages: ChatMessage[] = [
      { role: "system", content: args.system },
      { role: "user", content: anonymizeText(args.user, { names }) },
      { role: "assistant", content: anonymizeText(args.assistant, { names }) },
    ]

    // Letzte Sicherheitsschleife: verbleibende PII → Beispiel verwerfen.
    const joined = messages.map((m) => m.content).join("\n")
    if (containsLikelyPii(joined)) {
      console.warn("[training] Beispiel verworfen — Restverdacht auf personenbezogene Daten")
      return false
    }

    const { error } = await supabase.from("ai_training_examples").insert({
      user_id: args.userId,
      task: args.task,
      messages,
      label_source: args.labelSource,
      label_strength: args.labelStrength ?? null,
      job_candidate_id: args.jobCandidateId ?? null,
    })
    if (error) {
      console.error("[training] Speichern übersprungen:", error.message)
      return false
    }
    return true
  } catch (err) {
    console.error("[training] recordTrainingExample fehlgeschlagen:", err)
    return false
  }
}

/**
 * Erzeugt aus einem abgeschlossenen Auswahlvorgang ein Trainingsbeispiel für
 * den Richter: Eingabe = Dossier + Hard Facts + Stelle, Ziel = das, was der
 * MENSCH am Ende entschieden hat (Interview-Bewertung bzw. Einstellung/Absage).
 */
export function buildJudgeExample(input: {
  dossierText: string
  hardFactsText: string
  jobText: string
  interviewScore?: number | null
  interviewNotes?: string | null
  outcome: "eingestellt" | "abgesagt" | "interviewt"
  names?: (string | null | undefined)[]
}): { system: string; user: string; assistant: string } {
  const system =
    "Du bewertest Kandidaten für Stellen nach strenger Rubrik und begründest jede Einschätzung mit Belegen. " +
    "Die Zielbewertung stammt aus einem strukturierten Interview bzw. der finalen Entscheidung eines erfahrenen Recruiters."

  const user = [
    "=== KARRIERE-DOSSIER ===",
    input.dossierText,
    "",
    "=== HARD FACTS ===",
    input.hardFactsText,
    "",
    input.jobText,
  ].join("\n")

  const assistant = [
    `Ergebnis der menschlichen Bewertung: ${input.outcome}.`,
    input.interviewScore != null ? `Strukturiertes Interview: ${input.interviewScore}/100.` : null,
    input.interviewNotes ? `Begründung: ${anonymizeText(input.interviewNotes, { names: input.names })}` : null,
  ]
    .filter(Boolean)
    .join(" ")

  return { system, user, assistant }
}

/** Trainingsbeispiel für die Dossier-Extraktion (Format- statt Urteilsaufgabe). */
export function buildDossierExample(input: {
  resumeText: string
  dossier: unknown
  names?: (string | null | undefined)[]
}): { system: string; user: string; assistant: string } {
  return {
    system:
      "Du überführst Lebensläufe in ein strukturiertes Karriere-Dossier: Stationen, Lücken, " +
      "Skills mit Belegtiefe, Sprachen, Ausbildung. Antworte ausschließlich als JSON.",
    user: `Lebenslauf:\n${input.resumeText.slice(0, 12000)}`,
    assistant: JSON.stringify(anonymizeDeep(input.dossier, { names: input.names ?? [] })),
  }
}
