import { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { computeCalibration, type CalibRow } from "@/lib/matching/calibration"

export const dynamic = "force-dynamic"
export const maxDuration = 300

/**
 * Nightly matching calibration (Vercel Cron, CRON_SECRET Bearer-protected).
 *
 * Per tenant: reads their own decision history (invited/rejected/hired +
 * structured interview scores), computes the calibration report (how well
 * IMLRS predicted their decisions) and — from MIN_DECISIONS onwards — the
 * bounded per-tenant weight adjustment. Pure aggregate statistics; nothing
 * is trained on personal data.
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
      .select("id")
      .limit(2000)
    if (usersErr) return Response.json({ error: usersErr.message }, { status: 500 })

    let calibrated = 0
    let withWeights = 0
    let skipped = 0

    for (const user of users || []) {
      const { data: rows, error: rowsErr } = await admin
        .from("job_candidates")
        .select(
          "match_score, interview_score, status, knockout, " +
            "hard_skills_score, experience_score, education_score, soft_skills_score, " +
            "languages_score, location_score, industry_score, salary_score, culture_score",
        )
        .eq("user_id", user.id)
        .not("match_score", "is", null)
        .limit(3000)

      if (rowsErr || !rows || rows.length === 0) {
        skipped++
        continue
      }

      const report = computeCalibration(rows as unknown as CalibRow[])
      const { error: upErr } = await admin
        .from("user_profiles")
        .update({ match_calibration: report, imlrs_weights: report.weights })
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
      if (report.weightsApplied) withWeights++
    }

    console.log(`[calibrate] users=${users?.length ?? 0} calibrated=${calibrated} weights=${withWeights} skipped=${skipped}`)
    return Response.json({ ok: true, calibrated, withWeights, skipped })
  } catch (error) {
    console.error("[calibrate] error:", error)
    return Response.json({ error: "Kalibrierung fehlgeschlagen" }, { status: 500 })
  }
}
