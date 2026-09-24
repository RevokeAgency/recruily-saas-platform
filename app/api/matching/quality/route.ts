import { createClient } from "@/lib/supabase/server"
import { computeCalibration, type CalibRow } from "@/lib/matching/calibration"
import { fetchCalibrationRows } from "@/lib/matching/screening"

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
    const { rows, error } = await fetchCalibrationRows(supabase, user.id)

    if (error) return Response.json({ report: null, source: "unavailable" })
    return Response.json({ report: computeCalibration((rows || []) as unknown as CalibRow[]), source: "live" })
  } catch (error) {
    console.error("[matching quality] error:", error)
    return Response.json({ error: "Interner Serverfehler" }, { status: 500 })
  }
}
