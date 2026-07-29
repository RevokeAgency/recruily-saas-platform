import { createClient } from "@/lib/supabase/server"
import { NextRequest } from "next/server"
import { scoreJobCandidateLink } from "@/lib/scoring"

// Re-scoring an existing job can take a few seconds per candidate.
export const maxDuration = 60

// Re-score at most this many candidates per call, to stay within the
// serverless time budget. Completed scores persist immediately, so a job with
// more candidates just needs the button pressed again.
const BATCH = 15

/**
 * Re-runs the IMLRS match for candidates already linked to this job — used to
 * apply newly added KO criteria (or edited requirements) to candidates that
 * were scored before the change.
 *
 * This is a re-evaluation of matches that were already paid for, so it does
 * NOT consume additional match quota. Owner-scoped.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })
    }

    // Ownership check.
    const { data: job } = await supabase
      .from("jobs").select("id").eq("id", jobId).eq("user_id", user.id).single()
    if (!job) return Response.json({ error: "Job nicht gefunden" }, { status: 404 })

    // Candidates that already went through matching (skip queued/analyzing).
    const { data: links, error: linksError } = await supabase
      .from("job_candidates")
      .select("id")
      .eq("job_id", jobId)
      .eq("user_id", user.id)
      .in("status", ["scored", "error"])
      .order("created_at", { ascending: true })
      .limit(BATCH + 1)

    if (linksError) {
      return Response.json({ error: linksError.message }, { status: 500 })
    }

    const all = links || []
    const batch = all.slice(0, BATCH)
    const hasMore = all.length > BATCH

    let rescored = 0
    for (const link of batch) {
      await supabase.from("job_candidates").update({ status: "analyzing" }).eq("id", link.id)
      await scoreJobCandidateLink(supabase, link.id)
      rescored++
    }

    return Response.json({ rescored, hasMore })
  } catch (error) {
    console.error("Error re-scoring job candidates:", error)
    return Response.json({ error: "Neubewertung fehlgeschlagen" }, { status: 500 })
  }
}
