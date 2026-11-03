import { generateText, Output, type ModelMessage } from "ai"
import type { z } from "zod"
import { modelChain, type AiTask } from "./provider"

// ─────────────────────────────────────────────────────────────────────────────
// Einheitlicher Ausführungspfad für alle KI-Aufrufe.
//
// Zweck:
//  - EIN Ort, der die Provider-Kette (EU zuerst) durchläuft,
//  - Temperatur 0 als Standard → reproduzierbare Ergebnisse,
//  - klare, sprechende Fehler statt anonymer Abbrüche,
//  - Protokoll, welcher Provider/welches Modell geantwortet hat (AI Act).
// ─────────────────────────────────────────────────────────────────────────────

export interface AiRunInfo {
  provider: string
  modelId: string
  euResident: boolean
}

export interface StructuredResult<T> {
  output: T
  run: AiRunInfo
}

/**
 * Wiederholungen je Modell. Das SDK wartet zwischen den Versuchen 2, 4, 8
 * und 16 Sekunden und hält sich an einen Retry-After-Header. Mit dem Standard
 * (2 Wiederholungen, 6 Sekunden) reichte das bei einem Rate-Limit pro Minute
 * nicht: Großes und kleines Modell teilen sich das Kontingent des Kontos, also
 * scheiterten beide im selben Fenster.
 */
export const AI_MAX_RETRIES = 4

/**
 * Fester Zufallswert für jede Anfrage (bei Mistral "random_seed"). Temperatur 0
 * allein macht die Antwort nicht vollständig gleich, weil das Modell bei
 * Gleichstand zwischen Tokens trotzdem zufällig wählt. Mit festem Seed liefern
 * gleiche Eingaben deutlich stabiler dasselbe Ergebnis. Ganz garantiert ist es
 * nicht, die Rechenumgebung beim Anbieter kann trotzdem minimal abweichen.
 */
export const AI_SEED = 20261103

/** Ist das Modell im Tarif des Kontos nicht freigeschaltet (Fehler bei uns, nicht beim Kunden)? */
export function isTierNotAllowed(message: string): boolean {
  return /not available in your subscription tier|tier_not_allowed/i.test(message)
}

/** Hat der Anbieter wegen zu vieler Anfragen abgelehnt? */
export function isRateLimit(message: string): boolean {
  return /rate.?limit|too many requests|\b429\b|capacity exceeded/i.test(message)
}

/**
 * Was der Anbieter bei einem Fehler wirklich geschickt hat: HTTP-Status,
 * Antworttext und die Header zu Limits. Das SDK verpackt den letzten Fehler
 * nach den Wiederholungen in einen RetryError, dessen Meldung nur noch
 * "Rate limit exceeded" sagt. Welches Limit (pro Sekunde, pro Minute,
 * Monatsbudget) greift, steht nur in Antwort und Headern.
 */
export function providerErrorDetail(err: unknown): string | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = err as any
  const inner = e?.lastError ?? (Array.isArray(e?.errors) ? e.errors[e.errors.length - 1] : null) ?? e
  if (!inner || (inner.statusCode == null && inner.responseBody == null)) return null
  const headers: Record<string, string> = inner.responseHeaders ?? {}
  const limits = Object.entries(headers)
    .filter(([k]) => /ratelimit|retry-after|x-kong|request-id/i.test(k))
    .map(([k, v]) => `${k}=${v}`)
    .join(", ")
  const body = typeof inner.responseBody === "string" ? inner.responseBody.slice(0, 400) : ""
  const attempts = Array.isArray(e?.errors) ? ` nach ${e.errors.length} Versuchen` : ""
  return `HTTP ${inner.statusCode ?? "?"}${attempts}${body ? `, Antwort: ${body}` : ""}${limits ? `, Header: ${limits}` : ""}`
}

/** Fehler, die ein anderes Modell ebenfalls nicht lösen würde. */
function isTerminal(message: string): boolean {
  return /schema|validation|zod|invalid.*json/i.test(message)
}

/**
 * Strukturierte Generierung gegen ein Zod-Schema, mit Provider-Kette.
 * Wirft erst, wenn ALLE Modelle der Kette gescheitert sind — die Meldung
 * nennt dann Kette und letzten Grund.
 */
export async function generateStructured<T>(args: {
  task: AiTask
  schema: z.ZodType<T>
  system: string
  prompt?: string
  messages?: ModelMessage[]
  label: string
  temperature?: number
}): Promise<StructuredResult<T>> {
  const chain = modelChain(args.task)
  if (chain.length === 0) {
    throw new Error(
      `${args.label}: Kein KI-Provider konfiguriert — MISTRAL_API_KEY fehlt in dieser Umgebung.`,
    )
  }

  // Grund je Modell. Bisher stand in der Meldung nur der letzte, und der war
  // irreführend: "Rate limit" vom Rückfallmodell, obwohl das erste Modell mit
  // "nicht in deinem Tarif" abgelehnt hatte.
  const failures: string[] = []
  for (let i = 0; i < chain.length; i++) {
    const entry = chain[i]
    try {
      const { output } = await generateText({
        model: entry.model,
        temperature: args.temperature ?? 0,
        maxRetries: AI_MAX_RETRIES,
        seed: AI_SEED,
        output: Output.object({ schema: args.schema }),
        system: args.system,
        ...(args.messages ? { messages: args.messages } : { prompt: args.prompt ?? "" }),
      })
      if (!output) throw new Error("Leere Modellantwort")

      if (i !== 0) {
        console.warn(`[ai] ${args.label}: Fallback auf ${entry.provider}:${entry.modelId}`)
      }
      if (!entry.euResident) {
        console.warn(`[ai] ${args.label}: Verarbeitung außerhalb der EU (${entry.provider}) — Notfallpfad aktiv.`)
      }
      return {
        output,
        run: { provider: entry.provider, modelId: entry.modelId, euResident: entry.euResident },
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      failures.push(`${entry.provider}:${entry.modelId}: ${msg}`)
      const detail = providerErrorDetail(err)
      console.error(`[ai] ${args.label} mit ${entry.provider}:${entry.modelId} fehlgeschlagen: ${msg}${detail ? ` | ${detail}` : ""}`)
      // Schema-/JSON-Fehler lösen andere Anbieter meist nicht anders — der
      // Wechsel dorthin lohnt dann nicht. Ein anderes Modell DESSELBEN Anbieters
      // kann dieselbe Ausgabe aber sehr wohl sauber liefern (small parst
      // täglich zuverlässig ins Schema). Deshalb nur abbrechen, wenn als
      // Nächstes ein fremder Anbieter käme.
      const next = chain[i + 1]
      if (isTerminal(msg) && (!next || next.provider !== entry.provider)) break
    }
  }

  throw new Error(`${args.label} fehlgeschlagen: ${failures.join(" | ")}`)
}

/** Freitext-Generierung über dieselbe Kette (selten gebraucht). */
export async function generatePlain(args: {
  task: AiTask
  system?: string
  prompt: string
  label: string
}): Promise<{ text: string; run: AiRunInfo }> {
  const chain = modelChain(args.task)
  if (chain.length === 0) throw new Error(`${args.label}: Kein KI-Provider konfiguriert.`)

  let lastError: unknown = null
  for (const entry of chain) {
    try {
      const { text } = await generateText({
        model: entry.model,
        temperature: 0,
        maxRetries: AI_MAX_RETRIES,
        seed: AI_SEED,
        system: args.system,
        prompt: args.prompt,
      })
      return {
        text,
        run: { provider: entry.provider, modelId: entry.modelId, euResident: entry.euResident },
      }
    } catch (err) {
      lastError = err
      console.error(`[ai] ${args.label} mit ${entry.provider}:${entry.modelId} fehlgeschlagen`)
    }
  }
  throw new Error(
    `${args.label} fehlgeschlagen: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  )
}
