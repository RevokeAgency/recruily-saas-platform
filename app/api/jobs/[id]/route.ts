import { createClient } from "@/lib/supabase/server"
import { NextRequest } from "next/server"

// Close / reopen a job. Closing frees the active-job slot; reopening re-checks
// the plan's active-job limit. Existing candidates are always preserved.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })
    }

    const body = await request.json()
    const isActive = body.isActive === true

    const { data: job } = await supabase
      .from("jobs").select("id, is_active").eq("id", id).eq("user_id", user.id).single()
    if (!job) return Response.json({ error: "Job nicht gefunden" }, { status: 404 })

    // Reopening consumes a slot → enforce the active-job limit.
    if (isActive && !job.is_active) {
      const { data: profile } = await supabase
        .from("user_profiles").select("active_jobs_limit").eq("id", user.id).single()
      const limit = profile?.active_jobs_limit ?? 1
      const { count } = await supabase
        .from("jobs").select("id", { count: "exact", head: true })
        .eq("is_active", true).eq("user_id", user.id)
      if ((count ?? 0) >= limit) {
        return Response.json({ error: "job_limit_reached", limit }, { status: 403 })
      }
    }

    const { error } = await supabase
      .from("jobs").update({ is_active: isActive }).eq("id", id).eq("user_id", user.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ success: true, isActive })
  } catch (error) {
    console.error("Error updating job:", error)
    return Response.json({ error: "Interner Serverfehler" }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get job data
    const { data: job, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      console.error("Error fetching job:", error)
      return Response.json(
        { error: "Job nicht gefunden" },
        { status: 404 }
      )
    }

    // Get candidate statistics for this job
    const { data: jobCandidates, error: candidatesError } = await supabase
      .from("job_candidates")
      .select("id, status, match_score")
      .eq("job_id", id)

    if (candidatesError) {
      console.error("Error fetching job candidates:", candidatesError)
    }

    const candidates = jobCandidates || []

    // Calculate stats
    const totalCandidates = candidates.length
    const matches = candidates.filter(c => c.match_score !== null && c.match_score > 0).length
    const topMatchScore = candidates.length > 0 
      ? Math.max(...candidates.map(c => c.match_score || 0))
      : 0

    return Response.json({ 
      job: {
        ...job,
        candidate_count: totalCandidates,
        application_count: totalCandidates,
        match_count: matches,
        top_match_score: topMatchScore,
      }
    })
  } catch (error) {
    console.error("Error:", error)
    return Response.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    )
  }
}
