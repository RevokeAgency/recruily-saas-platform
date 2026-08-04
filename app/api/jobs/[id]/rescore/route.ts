import { createClient } from "@/lib/supabase/server"
import { NextRequest } from "next/server"
import { scoreJobCandidateLink } from "@/lib/scoring"

// Re-scoring an existing job can take a few seconds per candidate.
export const maxDuration = 300

// Re-score at most this many candidates per call, to stay within the
// serverless time budget. IMLRS 2.0 runs a full judge+verifier pipeline
// (~30-60s per candidate), so the batch is small and processed 2 at a time.
// Completed scores persist immediately, so a job with more candidates just
// needs the button pressed again.
const BATCH = 6
const CONCURRENCY = 2

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

    // Optional: retry a single candidate (used by "Erneut versuchen" on errors).
    const body = await req.json().catch(() => ({} as { linkId?: string }))
    const singleLinkId = typeof body?.linkId === "string" ? body.linkId : null

    // Candidates that already went through matching (skip queued/analyzing).
    let query = supabase
      .from("job_candidates")
      .select("id")
      .eq("job_id", jobId)
      .eq("user_id", user.id)
    query = singleLinkId
      ? query.eq("id", singleLinkId)
      : query.in("status", ["scored", "error"]).order("created_at", { ascending: true }).limit(BATCH + 1)
    const { data: links, error: linksError } = await query

    if (linksError) {
      return Response.json({ error: linksError.message }, { status: 500 })
    }

    const all = links || []
    const batch = all.slice(0, BATCH)
    const hasMore = all.length > BATCH

    // Process the batch with limited concurrency (pipeline is slow per head).
    let rescored = 0
    const queue = [...batch]
    const worker = async () => {
      for (let link = queue.shift(); link; link = queue.shift()) {
        await supabase.from("job_candidates").update({ status: "analyzing" }).eq("id", link.id)
        await scoreJobCandidateLink(supabase, link.id)
        rescored++
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker))

    return Response.json({ rescored, hasMore })
  } catch (error) {
    console.error("Error re-scoring job candidates:", error)
    return Response.json({ error: "Neubewertung fehlgeschlagen" }, { status: 500 })
  }
}
