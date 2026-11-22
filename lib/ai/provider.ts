import { AsyncLocalStorage } from "node:async_hooks"
import { createMistral } from "@ai-sdk/mistral"

// ─────────────────────────────────────────────────────────────────────────────
// Zentrale KI-Provider-Schicht (EU-Datenhoheit).
//
// Revetly verarbeitet Bewerberdaten — also personenbezogene Daten besonderer
// Sensibilität. Einziger Anbieter ist deshalb **Mistral über La Plateforme
// (Frankreich, EU)**. Einen Rückfall auf einen Anbieter außerhalb der EU gibt
// es nicht mehr (früher Google über AI_ALLOW_NON_EU_FALLBACK, entfernt am
// 21.11.2026). Ein weiterer Anbieter darf nur in PROVIDERS mit eu: true
// aufgenommen werden; tests/ai-provider-eu.test.ts schlägt sonst fehl.
//
// Alle KI-Aufrufe der Anwendung gehen über dieses Modul. Das hält die
// Provider-Entscheidung an einer Stelle, macht sie auditierbar (AI Act) und
// ist später der Einhängepunkt für ein eigenes feingetuntes Modell.
// ─────────────────────────────────────────────────────────────────────────────

/** Aufgabenklassen — die Modellwahl ist bewusst pro Aufgabe getroffen. */
export type AiTask =
  /** Urteilen mit strenger Rubrik: Richter, Prüfinstanz, Bestenvergleich. */
  | "reasoning"
  /** Strukturierte Extraktion in festes Schema: Dossier, CV-/Job-Parsing. */
  | "extraction"
  /** Kürzere Hilfsaufgaben: Skill-Matrix, Interview-Leitfaden. */
  | "utility"
  /** Prüfinstanz (Vier-Augen-Prinzip) — Kontrolle gegen feste Kriterien. */
  | "verification"
  /** Bildverstehen (nur noch Fallback bei der Foto-Extraktion). */
  | "vision"
  /** Revy: Plan und Werkzeugwahl (Function Calling). */
  | "agent_plan"
  /** Revy: Formulierung der Antwort, Einordnung von Anfragen, Entwürfe. */
  | "agent_write"

/**
 * Zugelassene Anbieter. Nur Anbieter mit Verarbeitung in der EU. Ein Wechsel
 * des Anbieters ist ein Eintrag hier plus AI_PROVIDER, keine Codeänderung an
 * den Aufrufern.
 */
export const PROVIDERS = {
  mistral: { eu: true, label: "Mistral AI (La Plateforme, EU)" },
} as const

type ProviderName = keyof typeof PROVIDERS

/**
 * Modellwahl je Aufgabe, mit festen Versionen statt "-latest".
 *
 * Grund sind die Kontingente bei Mistral (Stand 03.11.2026, Bezahlplan):
 * mistral-large-2512 hat 250.000 Tokens pro Minute, mistral-small-2603 und
 * mistral-large-4 nur je 20.000. Eine Bewerbung braucht über alle Schritte
 * (Lebenslauf lesen, Dossier, Skill-Deckung, Urteil, Prüfung) grob 20.000
 * bis 40.000 Tokens. Mit small für die Extraktion war das Minutenkontingent
 * schon vor dem Urteil verbraucht, und der Rückfall auf small scheiterte am
 * selben Kontingent. Ein "-latest"-Alias kann außerdem ohne Vorwarnung auf ein
 * neues Modell mit kleinem Kontingent umspringen.
 *
 * Deshalb laufen alle Textaufgaben auf mistral-large-2512, small bleibt
 * Rückfall. Jede Aufgabe lässt sich per Umgebungsvariable übersteuern; nach
 * einem Wechsel /api/matching/eval laufen lassen.
 * - vision → pixtral: einziger Bildpfad, nur Fallback.
 */
// AI_MODEL_MATCHING stellt alle vier Textaufgaben des Matchings auf einmal um
// (etwa auf mistral-large-latest). Einzelne AI_MODEL_* gehen weiterhin vor.
// Vorher /api/matching/eval?vergleich=<modell> laufen lassen.
const PRIMARY = process.env.AI_MODEL_MATCHING || "mistral-large-2512"
const SECONDARY = "mistral-small-latest"

/** Aufgaben, die zum Matching gehören (für Vergleich und Umstellung). */
export const MATCHING_TASKS: AiTask[] = ["reasoning", "extraction", "utility", "verification"]

// Modell nur für einen Ablauf übersteuern, ohne Umgebungsvariable: für den
// Vorher-Nachher-Vergleich im Eval. Gilt nur innerhalb von withMatchingModel.
const matchingOverride = new AsyncLocalStorage<string>()

/** Führt fn mit einem anderen Modell für die Matching-Aufgaben aus. Nur EU-Modelle von Mistral. */
export function withMatchingModel<T>(modelId: string, fn: () => Promise<T>): Promise<T> {
  if (!/^(mistral|magistral|ministral|open-mistral|pixtral)-[a-z0-9.-]+$/.test(modelId)) {
    throw new Error(`Unbekanntes Modell: ${modelId}`)
  }
  return matchingOverride.run(modelId, fn)
}

const MISTRAL_MODELS: Record<AiTask, string> = {
  reasoning: process.env.AI_MODEL_REASONING || PRIMARY,
  extraction: process.env.AI_MODEL_EXTRACTION || PRIMARY,
  utility: process.env.AI_MODEL_UTILITY || PRIMARY,
  verification: process.env.AI_MODEL_VERIFICATION || PRIMARY,
  vision: process.env.AI_MODEL_VISION || "pixtral-12b-2409",
  // Revy: das stärkere Modell plant und wählt Werkzeuge, das kleine
  // formuliert. Aliase laut Mistral-Doku (21.11.2026): Large 4, Small 4.
  agent_plan: process.env.AI_MODEL_AGENT_PLAN || "mistral-large-latest",
  agent_write: process.env.AI_MODEL_AGENT_WRITE || "mistral-small-latest",
}

// In-EU-Modellfallback: Fällt das erste Modell aus (Kapazitätsgrenze,
// Rate-Limit, kein Zugriff), versucht es das zweite. Beide bleiben in der EU.
const MISTRAL_FALLBACK: Partial<Record<AiTask, string>> = {
  reasoning: process.env.AI_MODEL_REASONING_FALLBACK || SECONDARY,
  extraction: process.env.AI_MODEL_EXTRACTION_FALLBACK || SECONDARY,
  utility: process.env.AI_MODEL_UTILITY_FALLBACK || SECONDARY,
  verification: process.env.AI_MODEL_VERIFICATION_FALLBACK || SECONDARY,
  agent_plan: process.env.AI_MODEL_AGENT_PLAN_FALLBACK || "mistral-small-latest",
}

/**
 * Der Mistral-Key wird unter mehreren gebräuchlichen Namen akzeptiert, damit
 * eine abweichende Benennung in der Hosting-Umgebung nicht das gesamte
 * Matching lahmlegt. Kanonisch ist MISTRAL_API_KEY.
 */
export function mistralApiKey(): string | undefined {
  return (
    process.env.MISTRAL_API_KEY ||
    process.env.MISTRAL_GENERATIVE_AI_API_KEY ||
    process.env.NEXT_MISTRAL_API_KEY ||
    undefined
  )
}

function mistralClient() {
  const apiKey = mistralApiKey()
  if (!apiKey) return null
  return createMistral({ apiKey })
}

export interface ResolvedModel {
  // Provider-Modellinstanz (SDK-Version-agnostisch typisiert, damit ein
  // Provider-Upgrade nicht die ganze Kette bricht).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: any
  provider: ProviderName
  modelId: string
  /** true, wenn die Verarbeitung EU-intern bleibt (für Audit/Protokoll). */
  euResident: boolean
}

/**
 * Liefert die Modell-Kette für eine Aufgabe: das konfigurierte Modell, danach
 * ein kleineres Modell desselben EU-Anbieters. Nie ein Anbieter außerhalb der EU.
 */
export function modelChain(task: AiTask): ResolvedModel[] {
  const chain: ResolvedModel[] = []

  const mistral = mistralClient()
  if (mistral) {
    const override = MATCHING_TASKS.includes(task) ? matchingOverride.getStore() : undefined
    const id = override ?? MISTRAL_MODELS[task]
    chain.push({ model: mistral(id), provider: "mistral", modelId: id, euResident: true })
    // Kleineres Modell desselben Anbieters als Rückfall.
    const fb = MISTRAL_FALLBACK[task]
    if (fb && fb !== id) {
      chain.push({ model: mistral(fb), provider: "mistral", modelId: fb, euResident: true })
    }
  }

  // Harte Sperre: Was nicht als EU-Anbieter eingetragen ist, fällt raus.
  return chain.filter((m) => PROVIDERS[m.provider]?.eu === true && m.euResident)
}

/** Menschenlesbare Kette für Logs/Diagnose, z. B. "mistral:mistral-large-2512". */
export function describeChain(task: AiTask): string[] {
  return modelChain(task).map((m) => `${m.provider}:${m.modelId}`)
}

/** Ist überhaupt ein Provider konfiguriert? */
export function aiConfigured(): boolean {
  return modelChain("utility").length > 0
}
