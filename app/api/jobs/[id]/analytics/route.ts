import { createClient } from "@/lib/supabase/server"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params
    const supabase = await createClient()

    // Get all candidates for this job with their scores and status
    const { data: jobCandidates, error } = await supabase
      .from("job_candidates")
      .select("id, status, match_score, created_at")
      .eq("job_id", jobId)

    if (error) {
      console.error("Error fetching job analytics:", error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    const candidates = jobCandidates || []
    const totalCandidates = candidates.length

    // Pipeline counts by status
    const statusCounts = {
      new: 0,
      analyzing: 0,
      scored: 0,
      shortlisted: 0,
      interviewed: 0,
      offered: 0,
      hired: 0,
      rejected: 0,
    }

    candidates.forEach((c) => {
      const status = c.status as keyof typeof statusCounts
      if (status in statusCounts) {
        statusCounts[status]++
      }
    })

    // Match score distribution
    const scoreDistribution = {
      excellent: 0, // 90-100
      good: 0,      // 80-89
      fair: 0,      // 70-79
      belowAverage: 0, // 60-69
      poor: 0,      // <60
    }

    const scoredCandidates = candidates.filter((c) => c.match_score !== null)
    
    scoredCandidates.forEach((c) => {
      const score = c.match_score!
      if (score >= 90) {
        scoreDistribution.excellent++
      } else if (score >= 80) {
        scoreDistribution.good++
      } else if (score >= 70) {
        scoreDistribution.fair++
      } else if (score >= 60) {
        scoreDistribution.belowAverage++
      } else {
        scoreDistribution.poor++
      }
    })

    // Calculate average score
    const avgScore = scoredCandidates.length > 0
      ? Math.round(scoredCandidates.reduce((sum, c) => sum + (c.match_score || 0), 0) / scoredCandidates.length)
      : 0

    // Calculate days since first candidate (for time metrics)
    let daysSinceFirstCandidate = 0
    if (candidates.length > 0) {
      const sortedByDate = [...candidates].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      const firstDate = new Date(sortedByDate[0].created_at)
      daysSinceFirstCandidate = Math.floor(
        (Date.now() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
      )
    }

    // Calculate conversion rate (shortlisted + interviewed + offered + hired vs total)
    const progressedCount = statusCounts.shortlisted + statusCounts.interviewed + statusCounts.offered + statusCounts.hired
    const conversionRate = totalCandidates > 0 
      ? Math.round((progressedCount / totalCandidates) * 100) 
      : 0

    return Response.json({
      totalCandidates,
      scoredCandidates: scoredCandidates.length,
      avgScore,
      conversionRate,
      daysSinceFirstCandidate,
      statusCounts,
      scoreDistribution,
    })
  } catch (error) {
    console.error("Error in job analytics API:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
