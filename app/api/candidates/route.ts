import { createClient } from "@/lib/supabase/server"
import { runIMLRSMatch } from "@/lib/matching/imlrs"
import { checkAndIncrementMatch } from "@/app/actions/match"

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get all candidates
    const { data: candidates, error } = await supabase
      .from("candidates")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching candidates:", error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Get job links count for each candidate
    const { data: jobLinks, error: linksError } = await supabase
      .from("job_candidates")
      .select("candidate_id")

    if (linksError) {
      console.error("Error fetching job links:", linksError)
    }

    // Count job links per candidate
    const jobCountMap = new Map<string, number>()
    for (const link of jobLinks || []) {
      const count = jobCountMap.get(link.candidate_id) || 0
      jobCountMap.set(link.candidate_id, count + 1)
    }

    // Enrich candidates with job_count
    const enrichedCandidates = (candidates || []).map(candidate => ({
      ...candidate,
      job_count: jobCountMap.get(candidate.id) || 0,
    }))

    return Response.json({ candidates: enrichedCandidates })
  } catch (error) {
    console.error("Error in candidates API:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const body = await req.json()

    const candidateData = {
      full_name: body.full_name,
      email: body.email || null,
      phone: body.phone || null,
      job_title: body.job_title || null,
      years_of_experience: Math.round(body.years_of_experience || 0), // Round to integer
      experience_level: body.experience_level || "mid",
      skills: body.skills || [],
      education: body.education || null,
      summary_ai: body.summary_ai || null,
      location: body.location || null,
    }

    const { data: candidate, error } = await supabase
      .from("candidates")
      .insert(candidateData)
      .select()
      .single()

    if (error) {
      console.error("Error creating candidate:", error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    let linkId: string | null = null

    // If a jobId was provided, create the job_candidates link with "analyzing" status
    if (body.jobId && candidate) {
      // Check and increment the match counter before running the match
      const matchCheck = await checkAndIncrementMatch()
      if (!matchCheck.allowed) {
        return Response.json(
          { error: "match_limit_reached", used: matchCheck.used, limit: matchCheck.limit, candidate },
          { status: 403 }
        )
      }

      const { data: linkData, error: linkError } = await supabase
        .from("job_candidates")
        .insert({
          job_id: body.jobId,
          candidate_id: candidate.id,
          status: "analyzing", // Start in analyzing state
        })
        .select("id")
        .single()

      if (linkError) {
        console.error("Error linking candidate to job:", linkError)
      } else {
        linkId = linkData?.id
      }

      // Fire IMLRS matching - we await to ensure it completes before response
      // In a production app, this should be done via a queue/background job
      if (linkId) {
        // Don't await - let it run in background but ensure it starts
        triggerIMLRSMatch(body.jobId, candidate.id, linkId, candidateData).catch(err => {
          console.error("[v0] Background IMLRS match failed:", err)
        })
      }
    }

    return Response.json({ candidate, linkId })
  } catch (error) {
    console.error("Error in candidates API:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Background function to trigger IMLRS matching
async function triggerIMLRSMatch(
  jobId: string,
  candidateId: string,
  linkId: string,
  candidateData: {
    full_name: string
    skills: string[]
    years_of_experience: number
    experience_level: string
    education: string | null
    location: string | null
    summary_ai: string | null
  }
) {
  console.log("[v0] Starting IMLRS match for linkId:", linkId)
  
  try {
    // Get job data
    const supabase = await createClient()
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .single()

    if (jobError || !job) {
      console.error("Error fetching job for matching:", jobError)
      await updateLinkStatus(linkId, "error")
      return
    }

    // Run the IMLRS match directly (no HTTP fetch — avoids Vercel auth on preview URLs)
    const match = await runIMLRSMatch(
      {
        id: candidateId,
        name: candidateData.full_name,
        skills: candidateData.skills,
        experience: `${candidateData.years_of_experience} years`,
        experienceLevel: candidateData.experience_level,
        education: candidateData.education,
        location: candidateData.location,
      },
      {
        id: job.id,
        title: job.title,
        company: job.company,
        required_skills: job.required_skills || [],
        nice_to_have_skills: job.nice_to_have_skills || [],
        years_experience: job.years_experience,
        education: job.education,
        location: job.location,
        description: job.description,
      }
    )

    const categories = match?.categories

    // Helper to safely round scores to integers
    const roundScore = (score: number | undefined | null): number | null => {
      if (score === undefined || score === null) return null
      return Math.round(score)
    }

    // Update job_candidates with match scores (rounded to integers)
    const { error: updateError } = await supabase
      .from("job_candidates")
      .update({
        status: "scored",
        match_score: roundScore(match?.overallScore),
        hard_skills_score: roundScore(categories?.hardSkills?.score),
        experience_score: roundScore(categories?.experience?.score),
        education_score: roundScore(categories?.education?.score),
        soft_skills_score: roundScore(categories?.softSkills?.score),
        languages_score: roundScore(categories?.languages?.score),
        location_score: roundScore(categories?.location?.score),
        industry_score: roundScore(categories?.industry?.score),
        salary_score: roundScore(categories?.salary?.score),
        culture_score: roundScore(categories?.culture?.score),
        career_prognosis: match?.careerPrognosis,
        ai_summary: match?.whyTheyFit?.join(" | "),
      })
      .eq("id", linkId)

    if (updateError) {
      console.error("[v0] Error updating match scores:", updateError)
    } else {
      console.log("[v0] Successfully updated match scores for linkId:", linkId, "score:", roundScore(match?.overallScore))
    }
  } catch (error) {
    console.error("[v0] Error in IMLRS matching:", error)
    await updateLinkStatus(linkId, "error")
  }
}

async function updateLinkStatus(linkId: string, status: string) {
  try {
    const supabase = await createClient()
    await supabase
      .from("job_candidates")
      .update({ status })
      .eq("id", linkId)
  } catch (error) {
    console.error("Error updating link status:", error)
  }
}
