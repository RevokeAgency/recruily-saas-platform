import { createClient } from "@/lib/supabase/server"
import { NextRequest } from "next/server"
import { runIMLRSMatch } from "@/lib/matching/imlrs"
import { describeChain, withMatchingModel } from "@/lib/ai/provider"
// Statisch importiert, damit das Golden-Set sicher im Serverless-Bundle landet
// (eine zur Laufzeit gelesene Datei würde vom Build-Tracing nicht erfasst).
import goldenSet from "@/scripts/eval/golden-set.json"

export const dynamic = "force-dynamic"
export const maxDuration = 300

// Ein voller Durchlauf dauert ~60 s. Wir stoppen vor dem Plattform-Limit und
// melden ehrlich, was noch offen ist — statt in einen Timeout zu laufen, bei
// dem der Aufrufer gar nichts sieht.
const ZEITBUDGET_MS = 240_000

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
 *   GET /api/matching/eval?modell=<id> → alle Fälle mit einem anderen Modell
 *   GET /api/matching/eval?vergleich=<id> → Vorher-Nachher: aktuelles gegen
 *       neues Modell, Fall für Fall, mit Empfehlung (vor einem Modellwechsel)
 *   …&nur=neu → im Vergleich nur das neue Modell rechnen (kürzer)
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

    const gestartet = Date.now()
    const url = new URL(req.url)
    const vergleich = url.searchParams.get("vergleich")
    const modell = url.searchParams.get("modell")
    // nur=neu: im Vergleich nur das neue Modell rechnen (spart die Zeit des
    // alten Laufs, wenn der Fall sonst nicht ins Zeitlimit passt).
    const nurNeu = url.searchParams.get("nur") === "neu"

    // Vorher-Nachher: jeden Fall mit dem aktuellen und dem neuen Modell.
    if (vergleich) {
      const zeilen: Array<{ id: string; erwartet: string; vorher: CaseResult | null; nachher: CaseResult; differenz: number | null }> = []
      const offen: string[] = []
      for (const c of cases) {
        if (zeilen.length > 0 && Date.now() - gestartet > ZEITBUDGET_MS - 100_000) {
          offen.push(c.id)
          continue
        }
        const vorher = nurNeu ? null : await runCase(c)
        const nachher = await runCase(c, vergleich)
        // Hat gar nicht das neue Modell geantwortet, sondern ein Rückfall?
        // Dann taugt der Fall nicht als Vergleich.
        if (nachher.modell && nachher.modell !== `mistral:${vergleich}`) {
          nachher.ok = false
          nachher.fehler = `Rückfall auf ${nachher.modell}: ${vergleich} hat nicht geantwortet`
        }
        zeilen.push({
          id: c.id,
          erwartet: `${c.expect.minOverall}-${c.expect.maxOverall}`,
          vorher,
          nachher,
          differenz: vorher?.score != null && nachher.score != null ? nachher.score - vorher.score : null,
        })
      }
      const ok = (k: "vorher" | "nachher") => zeilen.filter((z) => z[k]?.ok).length
      // Zu langsam für den Betrieb? Ein Matching darf höchstens 300 Sekunden
      // laufen; über 120 Sekunden je Bewerbung oder mehr als doppelt so lange
      // wie bisher ist ein Warnzeichen (meist ein kleines Kontingent).
      const langsam = zeilen.filter(
        (z) => z.nachher.sekunden > 120 || (z.vorher != null && z.nachher.sekunden > 2 * z.vorher.sekunden),
      )
      const fehler = zeilen.filter((z) => z.nachher.fehler).length
      const diffs = zeilen.map((z) => z.differenz).filter((d): d is number => d != null)
      const mittel = diffs.length ? Math.round((diffs.reduce((a, b) => a + Math.abs(b), 0) / diffs.length) * 10) / 10 : null
      const empfehlung =
        fehler > 0
          ? `Nicht umstellen: ${fehler} Fall/Fälle mit Fehler beim neuen Modell (oft Rate-Limit, siehe fehler).`
          : !nurNeu && ok("nachher") < ok("vorher")
            ? "Nicht umstellen: Das neue Modell liegt in weniger Fällen im erwarteten Band."
            : langsam.length
              ? `Noch nicht umstellen: Das neue Modell ist zu langsam (${langsam.map((z) => `${z.id} ${z.nachher.sekunden} s`).join(", ")}). Ein Matching darf höchstens 300 Sekunden dauern. Kontingent (Tokens pro Minute) bei Mistral prüfen.`
              : offen.length
              ? "Noch offen: Restliche Fälle einzeln mit &case=<id> nachholen."
              : "Umstellung unbedenklich: mindestens so viele Fälle im Band, keine Fehler."
      return Response.json({
        aktuell: describeChain("reasoning")[0],
        neu: `mistral:${vergleich}`,
        bestanden: { vorher: `${ok("vorher")}/${zeilen.length}`, nachher: `${ok("nachher")}/${zeilen.length}` },
        mittlereAbweichung: mittel,
        empfehlung,
        dauerSekunden: Math.round((Date.now() - gestartet) / 100) / 10,
        faelle: zeilen,
        offen: offen.length ? offen : undefined,
      })
    }

    const results = []
    const offen: string[] = []
    for (const c of cases) {
      // Reicht die Restzeit für einen weiteren Durchlauf?
      if (results.length > 0 && Date.now() - gestartet > ZEITBUDGET_MS - 70_000) {
        offen.push(c.id)
        continue
      }
      results.push({ id: c.id, erwartet: `${c.expect.minOverall}-${c.expect.maxOverall}`, ...(await runCase(c, modell ?? undefined)), note: c.note })
    }

    const bestanden = results.filter((r) => r.ok).length
    return Response.json({
      ok: bestanden === results.length && offen.length === 0,
      bestanden: `${bestanden}/${results.length}`,
      dauerSekunden: Math.round((Date.now() - gestartet) / 100) / 10,
      results,
      offen: offen.length ? offen : undefined,
      hinweis:
        offen.length
          ? `Zeitbudget erreicht — ${offen.length} Fall/Fälle offen. Einzeln nachholen: ?case=${offen[0]}`
          : bestanden === results.length
            ? "Alle Fälle im erwarteten Band — die Pipeline arbeitet wie vorgesehen."
            : "Abweichungen: Score-Bänder bzw. KO-Urteile prüfen (siehe 'note' je Fall).",
    })
  } catch (error) {
    console.error("[matching eval] error:", error)
    return Response.json({ error: "Eval fehlgeschlagen" }, { status: 500 })
  }
}

type CaseResult = Awaited<ReturnType<typeof runCase>>

/** Ein Fall, optional mit anderem Modell für die Matching-Aufgaben. */
async function runCase(c: GoldenCase, modelId?: string) {
  const started = Date.now()
  try {
    const match = modelId ? await withMatchingModel(modelId, () => runIMLRSMatch(c.candidate, c.job)) : await runIMLRSMatch(c.candidate, c.job)
    const inBand = match.overallScore >= c.expect.minOverall && match.overallScore <= c.expect.maxOverall
    const koOk = c.expect.knockout == null || match.knockout === c.expect.knockout
    return {
      ok: inBand && koOk,
      score: match.overallScore as number | null,
      knockout: match.knockout,
      knockoutErwartet: c.expect.knockout ?? null,
      modell: match.detail.modelUsed,
      euIntern: match.detail.euResident,
      sekunden: Math.round((Date.now() - started) / 100) / 10,
      fehler: undefined as string | undefined,
    }
  } catch (err) {
    return {
      ok: false,
      score: null,
      fehler: (err instanceof Error ? err.message : String(err)).slice(0, 300),
      sekunden: Math.round((Date.now() - started) / 100) / 10,
    }
  }
}
