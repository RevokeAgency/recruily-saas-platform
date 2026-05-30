import { createClient } from "@/lib/supabase/server"
import { NextRequest } from "next/server"

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
