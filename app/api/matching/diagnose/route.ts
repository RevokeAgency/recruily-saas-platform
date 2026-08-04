import { createClient } from "@/lib/supabase/server"
import { generateText } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { judgeModelChain } from "@/lib/matching/imlrs"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Matching self-check for the signed-in owner: is the AI key configured, and
 * which models in the judge chain actually answer? Use when candidates come
 * back with status "Fehler" — this pinpoints whether it's the key, the model
 * entitlement or a rate limit.
 *
 *   GET /api/matching/diagnose
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) {
      return Response.json({
        ok: false,
        hint: "GOOGLE_GENERATIVE_AI_API_KEY ist in dieser Umgebung nicht gesetzt — Matching kann nicht laufen.",
        models: [],
      })
    }

    const google = createGoogleGenerativeAI({ apiKey })
    const chain = judgeModelChain()

    const models = []
    for (const id of chain) {
      const started = Date.now()
      try {
        const { text } = await generateText({
          model: google(id),
          temperature: 0,
          prompt: "Antworte exakt mit: OK",
        })
        models.push({ model: id, ok: true, ms: Date.now() - started, sample: text.trim().slice(0, 20) })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        models.push({ model: id, ok: false, ms: Date.now() - started, error: message.slice(0, 300) })
      }
    }

    const usable = models.filter((m) => m.ok).map((m) => m.model)
    return Response.json({
      ok: usable.length > 0,
      chain,
      models,
      hint:
        usable.length === 0
          ? "Kein Modell erreichbar — API-Key prüfen (gültig? Abrechnung aktiv?)."
          : usable[0] !== chain[0]
            ? `Primärmodell ${chain[0]} nicht nutzbar — es läuft automatisch der Fallback ${usable[0]}.`
            : "Alle Modelle erreichbar.",
    })
  } catch (error) {
    console.error("[matching diagnose] error:", error)
    return Response.json({ error: "Diagnose fehlgeschlagen" }, { status: 500 })
  }
}
