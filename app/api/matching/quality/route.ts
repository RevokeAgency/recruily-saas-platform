import { createClient } from "@/lib/supabase/server"
import { computeCalibration, type CalibRow } from "@/lib/matching/calibration"

export const dynamic = "force-dynamic"

/**
 * Match quality for the signed-in tenant: serves the nightly calibration
 * report, or computes it live when the cron hasn't run yet (or migration 022
 * is still pending). Aggregate statistics over the tenant's OWN decisions.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

    // Prefer the stored nightly report.
    const { data: profile, error: profErr } = await supabase
      .from("user_profiles")
      .select("match_calibration")
      .eq("id", user.id)
      .single()

    if (!profErr && profile?.match_calibration) {
      return Response.json({ report: profile.match_calibration, source: "nightly" })
    }

    // Fallback: compute on the fly from the tenant's rows.
    const { data: rows, error } = await supabase
      .from("job_candidates")
      .select(
        "match_score, interview_score, status, knockout, " +
          "hard_skills_score, experience_score, education_score, soft_skills_score, " +
          "languages_score, location_score, industry_score, salary_score, culture_score",
      )
      .eq("user_id", user.id)
      .not("match_score", "is", null)
      .limit(3000)

    if (error) return Response.json({ report: null, source: "unavailable" })
    return Response.json({ report: computeCalibration((rows || []) as unknown as CalibRow[]), source: "live" })
  } catch (error) {
    console.error("[matching quality] error:", error)
    return Response.json({ error: "Interner Serverfehler" }, { status: 500 })
  }
}
