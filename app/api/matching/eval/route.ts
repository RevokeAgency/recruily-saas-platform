import { createClient } from "@/lib/supabase/server"
import { NextRequest } from "next/server"
import { runIMLRSMatch } from "@/lib/matching/imlrs"
// Statisch importiert, damit das Golden-Set sicher im Serverless-Bundle landet
// (eine zur Laufzeit gelesene Datei würde vom Build-Tracing nicht erfasst).
import goldenSet from "@/scripts/eval/golden-set.json"

export const dynamic = "force-dynamic"
export const maxDuration = 300

interface GoldenCase {
  id: string
  note: string
  expect: { minOverall: number; maxOverall: number; knockout?: boolean }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  candidate: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  job: any
}

/**
 * Führt das Golden-Set gegen die LIVE-Pipeline aus — der ehrliche Qualitäts-
 * check nach einem Provider- oder Prompt-Wechsel. Anders als /diagnose (nur
 * Verbindungstest) läuft hier die vollständige Kette inklusive strukturierter
 * JSON-Ausgaben, Hard Facts und Prüfinstanz.
 *
 *   GET /api/matching/eval            → alle Fälle
 *   GET /api/matching/eval?case=<id>  → ein Fall (schnell)
 *
 * Nur für eingeloggte Inhaber. Verbraucht KEIN Match-Kontingent (die Fälle sind
 * synthetisch und berühren keine Kundendaten).
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

    const only = new URL(req.url).searchParams.get("case")

    const golden = goldenSet as unknown as { cases: GoldenCase[] }
    const cases = golden.cases.filter((c) => !only || c.id === only)
    if (cases.length === 0) {
      return Response.json(
        { error: `Kein Fall gefunden${only ? ` für case=${only}` : ""}`, verfügbar: golden.cases.map((c) => c.id) },
        { status: 400 },
      )
    }

    const results = []
    for (const c of cases) {
      const started = Date.now()
      try {
        const match = await runIMLRSMatch(c.candidate, c.job)
        const inBand = match.overallScore >= c.expect.minOverall && match.overallScore <= c.expect.maxOverall
        const koOk = c.expect.knockout == null || match.knockout === c.expect.knockout
        results.push({
          id: c.id,
          ok: inBand && koOk,
          score: match.overallScore,
          erwartet: `${c.expect.minOverall}-${c.expect.maxOverall}`,
          knockout: match.knockout,
          knockoutErwartet: c.expect.knockout ?? null,
          modell: match.detail.modelUsed,
          euIntern: match.detail.euResident,
          sekunden: Math.round((Date.now() - started) / 100) / 10,
          note: c.note,
        })
      } catch (err) {
        results.push({
          id: c.id,
          ok: false,
          fehler: (err instanceof Error ? err.message : String(err)).slice(0, 300),
          sekunden: Math.round((Date.now() - started) / 100) / 10,
          note: c.note,
        })
      }
    }

    const bestanden = results.filter((r) => r.ok).length
    return Response.json({
      ok: bestanden === results.length,
      bestanden: `${bestanden}/${results.length}`,
      results,
      hinweis:
        bestanden === results.length
          ? "Alle Fälle im erwarteten Band — die Pipeline arbeitet wie vorgesehen."
          : "Abweichungen: Score-Bänder bzw. KO-Urteile prüfen (siehe 'note' je Fall).",
    })
  } catch (error) {
    console.error("[matching eval] error:", error)
    return Response.json({ error: "Eval fehlgeschlagen" }, { status: 500 })
  }
}
