import { createClient } from "@/lib/supabase/server"
import { createClient as createAdmin } from "@supabase/supabase-js"
import { after } from "next/server"
import { consumeMatch } from "@/lib/quota"
import { scoreJobCandidateLink } from "@/lib/scoring"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: candidateId } = await params
    const supabase = await createClient()
    const body = await req.json()
    const { jobId } = body

    if (!jobId) {
      return Response.json({ error: "jobId is required" }, { status: 400 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })
    }

    // Validate candidate + job + no duplicate link BEFORE spending a match, so
    // a failed/duplicate request never consumes quota.
    const { data: candidate, error: candidateError } = await supabase
      .from("candidates")
      .select("id")
      .eq("id", candidateId)
      .single()
    if (candidateError || !candidate) {
      return Response.json({ error: "Kandidat nicht gefunden" }, { status: 404 })
    }

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id")
      .eq("id", jobId)
      .single()
    if (jobError || !job) {
      return Response.json({ error: "Job nicht gefunden" }, { status: 404 })
    }

    const { data: existingLink } = await supabase
      .from("job_candidates")
      .select("id")
      .eq("job_id", jobId)
      .eq("candidate_id", candidateId)
      .single()
    if (existingLink) {
      return Response.json({ error: "Kandidat ist bereits mit diesem Job verknüpft" }, { status: 400 })
    }

    // Atomically spend one match (row-locked, monthly-reset aware).
    const quota = await consumeMatch(supabase, user.id)
    if (!quota.allowed) {
      return Response.json(
        { error: "match_limit_reached", used: quota.used, limit: quota.limit },
        { status: 403 }
      )
    }

    // Create the link, then score it in the background.
    const { data: linkData, error: linkError } = await supabase
      .from("job_candidates")
      .insert({
        job_id: jobId,
        candidate_id: candidateId,
        status: "analyzing",
        user_id: user.id,
      })
      .select("id")
      .single()

    if (linkError || !linkData) {
      console.error("Error linking candidate to job:", linkError)
      return Response.json({ error: linkError?.message ?? "Fehler beim Verknüpfen" }, { status: 500 })
    }

    // Score AFTER the response is sent. after() keeps the serverless function
    // alive until scoring finishes — a plain fire-and-forget promise gets
    // frozen/killed on Vercel once the response returns, which left candidates
    // stuck in "analyzing". A service-role client is used so the background work
    // doesn't depend on the request's (now torn-down) cookie context.
    const linkId = linkData.id
    after(async () => {
      try {
        const admin = createAdmin(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false } },
        )
        await scoreJobCandidateLink(admin, linkId)
      } catch (err) {
        console.error("[match] background scoring failed:", err)
      }
    })

    return Response.json({
      success: true,
      linkId: linkData.id,
      message: "Matching wird gestartet...",
    })
  } catch (error) {
    console.error("Error in match API:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
