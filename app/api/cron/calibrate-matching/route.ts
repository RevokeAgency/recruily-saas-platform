import { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { computeCalibration, type CalibRow } from "@/lib/matching/calibration"
import { fetchCalibrationRows } from "@/lib/matching/screening"
import { hasLearningConsent, mayApplyLearnedWeights } from "@/lib/training/consent"

export const dynamic = "force-dynamic"
export const maxDuration = 300

/**
 * Nightly matching calibration (Vercel Cron, CRON_SECRET Bearer-protected).
 *
 * Per tenant: reads their own decision history (invited/rejected/hired +
 * structured interview scores), computes the calibration report (how well
 * the analysis predicted their decisions) and, from MIN_DECISIONS onwards,
 * the bounded per-tenant weight adjustment. Pure aggregate statistics.
 *
 * Seit Positionierung v2 ("lernt nur für dein Konto, nur mit Zustimmung"):
 *   - Kalibriert wird nur mit gültiger Einwilligung in der aktuellen Fassung.
 *   - Angepasste Gewichte werden nur für die Pläne gespeichert, die
 *     "Gewichtung lernt mit" zusagen; die anderen bekommen nur den Bericht.
 *   - Konten ohne gültige Einwilligung werden bereinigt: Bericht und
 *     Gewichte aus früheren Läufen werden gelöscht.
 *   - Gerechnet wird mit dem reinen Analysewert (screening_score), damit das
 *     Gespräch nicht doppelt zählt.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get("authorization")
  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )

    const { data: users, error: usersErr } = await admin
      .from("user_profiles")
      .select("id, plan, ai_training_consent, ai_training_consent_version, imlrs_weights, match_calibration")
      .limit(2000)
    if (usersErr) return Response.json({ error: usersErr.message }, { status: 500 })

    let calibrated = 0
    let withWeights = 0
    let skipped = 0
    let cleared = 0

    for (const user of users || []) {
      if (!hasLearningConsent(user)) {
        // Keine (gültige) Einwilligung: nichts lernen, Reste früherer Läufe weg.
        if (user.imlrs_weights != null || user.match_calibration != null) {
          const { error } = await admin
            .from("user_profiles")
            .update({ imlrs_weights: null, match_calibration: null })
            .eq("id", user.id)
          if (!error) cleared++
        }
        skipped++
        continue
      }

      const { rows, error: rowsErr } = await fetchCalibrationRows(admin, user.id)
      if (rowsErr || !rows || rows.length === 0) {
        skipped++
        continue
      }

      const report = computeCalibration(rows as unknown as CalibRow[])
      const applyWeights = mayApplyLearnedWeights(user)
      const { error: upErr } = await admin
        .from("user_profiles")
        .update({ match_calibration: report, imlrs_weights: applyWeights ? report.weights : null })
        .eq("id", user.id)

      if (upErr) {
        // Missing columns → migration 022 pending; abort the whole run cleanly.
        if (/match_calibration|imlrs_weights/i.test(upErr.message || "")) {
          return Response.json({
            ok: false,
            reason: "Migration 022_feedback_loop.sql noch nicht ausgeführt",
          })
        }
        console.error("[calibrate] update failed for user:", upErr.message)
        continue
      }
      calibrated++
      if (applyWeights && report.weightsApplied) withWeights++
    }

    console.log(`[calibrate] users=${users?.length ?? 0} calibrated=${calibrated} weights=${withWeights} skipped=${skipped} cleared=${cleared}`)
    return Response.json({ ok: true, calibrated, withWeights, skipped, cleared })
  } catch (error) {
    console.error("[calibrate] error:", error)
    return Response.json({ error: "Kalibrierung fehlgeschlagen" }, { status: 500 })
  }
}
