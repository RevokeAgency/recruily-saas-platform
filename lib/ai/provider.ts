import { createMistral } from "@ai-sdk/mistral"
import { createGoogleGenerativeAI } from "@ai-sdk/google"

// ─────────────────────────────────────────────────────────────────────────────
// Zentrale KI-Provider-Schicht (EU-Datenhoheit).
//
// Revetly verarbeitet Bewerberdaten — also personenbezogene Daten besonderer
// Sensibilität. Standard-Provider ist deshalb **Mistral (Frankreich, EU)**:
// Bewerberdaten verlassen im Regelbetrieb die EU nicht. Google/Gemini bleibt
// nur als ausdrücklich zu aktivierender Notfall-Pfad im Code, damit ein
// Ausfall die Plattform nicht lahmlegt — standardmäßig ist er AUS.
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
  /** Bildverstehen (nur noch Fallback bei der Foto-Extraktion). */
  | "vision"

type ProviderName = "mistral" | "google"

/**
 * Modellwahl je Aufgabe. Begründung:
 * - reasoning  → mistral-large: bestes Urteilsvermögen für die Rubrik-Bewertung.
 * - extraction → mistral-small: Dossier/Parsing sind Formataufgaben mit hohem
 *   Volumen; small ist deutlich günstiger und schneller bei gleicher Qualität.
 *   Genau hier setzt später das eigene Fine-Tune an.
 * - utility    → mistral-small: kurze, eng geführte Aufgaben.
 * - vision     → pixtral: einziger Bildpfad, nur Fallback.
 */
const MISTRAL_MODELS: Record<AiTask, string> = {
  reasoning: process.env.AI_MODEL_REASONING || "mistral-large-latest",
  extraction: process.env.AI_MODEL_EXTRACTION || "mistral-small-latest",
  utility: process.env.AI_MODEL_UTILITY || "mistral-small-latest",
  vision: process.env.AI_MODEL_VISION || "pixtral-12b-2409",
}

// Notfall-Pfad. Nur aktiv, wenn AI_ALLOW_NON_EU_FALLBACK === "true".
const GOOGLE_MODELS: Record<AiTask, string> = {
  reasoning: "gemini-2.5-pro",
  extraction: "gemini-2.5-flash",
  utility: "gemini-2.5-flash",
  vision: "gemini-2.5-flash",
}

function mistralClient() {
  const apiKey = process.env.MISTRAL_API_KEY
  if (!apiKey) return null
  return createMistral({ apiKey })
}

function googleClient() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) return null
  return createGoogleGenerativeAI({ apiKey })
}

/**
 * Ist der Nicht-EU-Notfallpfad freigeschaltet? Bewusst opt-in: ohne diese
 * Variable verlassen Bewerberdaten die EU nie — auch nicht bei einem Ausfall.
 */
export function nonEuFallbackAllowed(): boolean {
  return process.env.AI_ALLOW_NON_EU_FALLBACK === "true"
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
 * Liefert die Modell-Kette für eine Aufgabe: primär Mistral (EU), danach —
 * nur wenn ausdrücklich erlaubt — der Notfall-Provider.
 */
export function modelChain(task: AiTask): ResolvedModel[] {
  const chain: ResolvedModel[] = []

  const mistral = mistralClient()
  if (mistral) {
    const id = MISTRAL_MODELS[task]
    chain.push({ model: mistral(id), provider: "mistral", modelId: id, euResident: true })
  }

  if (nonEuFallbackAllowed()) {
    const google = googleClient()
    if (google) {
      const id = GOOGLE_MODELS[task]
      chain.push({ model: google(id), provider: "google", modelId: id, euResident: false })
    }
  }

  return chain
}

/** Menschenlesbare Kette für Logs/Diagnose, z. B. "mistral:mistral-large-latest". */
export function describeChain(task: AiTask): string[] {
  return modelChain(task).map((m) => `${m.provider}:${m.modelId}`)
}

/** Ist überhaupt ein Provider konfiguriert? */
export function aiConfigured(): boolean {
  return modelChain("utility").length > 0
}
