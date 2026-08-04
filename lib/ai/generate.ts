import { generateText, Output, type ModelMessage } from "ai"
import type { z } from "zod"
import { modelChain, describeChain, type AiTask } from "./provider"

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

  let lastError: unknown = null
  for (const entry of chain) {
    try {
      const { output } = await generateText({
        model: entry.model,
        temperature: args.temperature ?? 0,
        output: Output.object({ schema: args.schema }),
        system: args.system,
        ...(args.messages ? { messages: args.messages } : { prompt: args.prompt ?? "" }),
      })
      if (!output) throw new Error("Leere Modellantwort")

      if (entry !== chain[0]) {
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
      lastError = err
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[ai] ${args.label} mit ${entry.provider}:${entry.modelId} fehlgeschlagen: ${msg}`)
      if (isTerminal(msg)) break
    }
  }

  throw new Error(
    `${args.label} fehlgeschlagen (${describeChain(args.task).join(" → ")}): ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  )
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
