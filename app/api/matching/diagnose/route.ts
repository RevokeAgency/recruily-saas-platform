import { createClient } from "@/lib/supabase/server"
import { generateText } from "ai"
import { z } from "zod"
import { modelChain, nonEuFallbackAllowed, mistralApiKey, type AiTask } from "@/lib/ai/provider"
import { generateStructured } from "@/lib/ai/generate"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const TASKS: AiTask[] = ["reasoning", "extraction", "utility", "vision"]

// Der eigentliche Matching-Fehler steckt fast immer im STRUKTURIERTEN Pfad
// (Urteil ins feste Schema), nicht in der reinen Erreichbarkeit. Der Klartext-
// Test oben kann deshalb "OK" melden, während das Scoring trotzdem scheitert.
// Diese Probe geht denselben Weg wie der Richter — inklusive EU-Modellfallback.
const probeSchema = z.object({
  ok: z.boolean().describe("immer true"),
  wert: z.number().describe("gib die Zahl 42 zurück"),
})

/**
 * KI-Selbsttest für den eingeloggten Inhaber: Welcher Provider/welches Modell
 * antwortet je Aufgabe — und bleibt die Verarbeitung in der EU? Erste Anlaufstelle,
 * wenn Kandidaten mit Status "Fehler" zurückkommen.
 *
 *   GET /api/matching/diagnose
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

    const results = []
    for (const task of TASKS) {
      const chain = modelChain(task)
      if (chain.length === 0) {
        results.push({ task, ok: false, error: "Kein Provider konfiguriert (MISTRAL_API_KEY fehlt)" })
        continue
      }
      const entry = chain[0]
      const started = Date.now()
      try {
        const { text } = await generateText({
          model: entry.model,
          temperature: 0,
          prompt: "Antworte exakt mit: OK",
        })
        results.push({
          task,
          ok: true,
          provider: entry.provider,
          model: entry.modelId,
          euResident: entry.euResident,
          ms: Date.now() - started,
          sample: text.trim().slice(0, 20),
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        results.push({
          task,
          ok: false,
          provider: entry.provider,
          model: entry.modelId,
          ms: Date.now() - started,
          error: message.slice(0, 300),
        })
      }
    }

    // Strukturierter End-to-End-Test des Urteilspfads (das, was beim Scoring
    // wirklich läuft). Nutzt die volle Kette, meldet das antwortende Modell.
    let structured: {
      ok: boolean
      provider?: string
      model?: string
      euResident?: boolean
      ms: number
      error?: string
    }
    {
      const started = Date.now()
      try {
        const { run } = await generateStructured({
          task: "reasoning",
          schema: probeSchema,
          system: "Du gibst ausschließlich das geforderte JSON zurück.",
          prompt: "Gib ok=true und wert=42 zurück.",
          label: "Diagnose-Strukturtest",
        })
        structured = {
          ok: true,
          provider: run.provider,
          model: run.modelId,
          euResident: run.euResident,
          ms: Date.now() - started,
        }
      } catch (err) {
        structured = {
          ok: false,
          ms: Date.now() - started,
          error: (err instanceof Error ? err.message : String(err)).slice(0, 400),
        }
      }
    }

    // Welcher Env-Name den Key tatsächlich liefert (häufigste Fehlerquelle).
    const keyVar = process.env.MISTRAL_API_KEY
      ? "MISTRAL_API_KEY"
      : process.env.MISTRAL_GENERATIVE_AI_API_KEY
        ? "MISTRAL_GENERATIVE_AI_API_KEY"
        : process.env.NEXT_MISTRAL_API_KEY
          ? "NEXT_MISTRAL_API_KEY"
          : null

    const failing = results.filter((r) => !r.ok)
    return Response.json({
      ok: failing.length === 0 && structured.ok,
      euOnly: !nonEuFallbackAllowed(),
      // Das ist der aussagekräftigste Wert bei Status "Fehler": Läuft der
      // strukturierte Urteilspfad? Wenn nein, steht hier der genaue Grund.
      urteilStrukturiert: structured,
      apiKey: {
        gefunden: !!mistralApiKey(),
        variable: keyVar,
        hinweis: keyVar && keyVar !== "MISTRAL_API_KEY"
          ? `Funktioniert, empfohlen ist aber der Name MISTRAL_API_KEY.`
          : undefined,
      },
      results,
      hint:
        failing.length === results.length
          ? "Kein Modell erreichbar — Mistral-Key prüfen (gesetzt? gültig? Abrechnung aktiv?)."
          : !structured.ok
            ? "Erreichbarkeit ok, aber der strukturierte Urteilspfad scheitert — genau das führt zu Status \"Fehler\". Grund siehe urteilStrukturiert.error."
            : failing.length > 0
              ? `Nicht erreichbar: ${failing.map((f) => f.task).join(", ")}.`
              : "Alle Aufgaben laufen über EU-Modelle.",
    })
  } catch (error) {
    console.error("[matching diagnose] error:", error)
    return Response.json({ error: "Diagnose fehlgeschlagen" }, { status: 500 })
  }
}
