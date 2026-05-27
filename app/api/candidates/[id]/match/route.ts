import { createClient } from "@/lib/supabase/server"

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

    // Check match limit
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("matches_used, matches_limit")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      return Response.json({ error: "Profil nicht gefunden" }, { status: 404 })
    }

    if (profile.matches_used >= profile.matches_limit) {
      return Response.json(
        { error: "match_limit_reached", used: profile.matches_used, limit: profile.matches_limit },
        { status: 403 }
      )
    }

    // Increment matches_used before proceeding
    await supabase
      .from("profiles")
      .update({ matches_used: profile.matches_used + 1 })
      .eq("id", user.id)

    // Check if candidate exists
    const { data: candidate, error: candidateError } = await supabase
      .from("candidates")
      .select("*")
      .eq("id", candidateId)
      .single()

    if (candidateError || !candidate) {
      return Response.json({ error: "Kandidat nicht gefunden" }, { status: 404 })
    }

    // Check if job exists
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .single()

    if (jobError || !job) {
      return Response.json({ error: "Job nicht gefunden" }, { status: 404 })
    }

    // Check if link already exists
    const { data: existingLink } = await supabase
      .from("job_candidates")
      .select("id")
      .eq("job_id", jobId)
      .eq("candidate_id", candidateId)
      .single()

    if (existingLink) {
      return Response.json({ error: "Kandidat ist bereits mit diesem Job verknüpft" }, { status: 400 })
    }

    // Create job_candidates link with "analyzing" status
    const { data: linkData, error: linkError } = await supabase
      .from("job_candidates")
      .insert({
        job_id: jobId,
        candidate_id: candidateId,
        status: "analyzing",
      })
      .select("id")
      .single()

    if (linkError) {
      console.error("Error linking candidate to job:", linkError)
      return Response.json({ error: linkError.message }, { status: 500 })
    }

    const linkId = linkData?.id

    // Trigger IMLRS matching in background
    if (linkId) {
      triggerIMLRSMatch(job, candidate, linkId).catch(err => {
        console.error("[v0] Background IMLRS match failed:", err)
      })
    }

    return Response.json({ 
      success: true, 
      linkId,
      message: "Matching wird gestartet..." 
    })
  } catch (error) {
    console.error("Error in match API:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Background function to trigger IMLRS matching
async function triggerIMLRSMatch(
  job: {
    id: string
    title: string
    company: string
    required_skills: string[] | null
    nice_to_have_skills: string[] | null
    years_experience: string | null
    education: string | null
    location: string | null
    description: string | null
  },
  candidate: {
    id: string
    full_name: string
    skills: string[]
    years_of_experience: number
    experience_level: string
    education: string | null
    location: string | null
  },
  linkId: string
) {
  try {
    const supabase = await createClient()

    // Call the match API
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    const matchResponse = await fetch(`${baseUrl}/api/match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidate: {
          id: candidate.id,
          name: candidate.full_name,
          skills: candidate.skills,
          experience: `${candidate.years_of_experience} years`,
          experienceLevel: candidate.experience_level,
          education: candidate.education,
          location: candidate.location,
        },
        job: {
          id: job.id,
          title: job.title,
          company: job.company,
          required_skills: job.required_skills || [],
          nice_to_have_skills: job.nice_to_have_skills || [],
          years_experience: job.years_experience,
          education: job.education,
          location: job.location,
          description: job.description,
        },
      }),
    })

    if (!matchResponse.ok) {
      console.error("Match API failed:", await matchResponse.text())
      await updateLinkStatus(linkId, "error")
      return
    }

    const matchResult = await matchResponse.json()
    
    // Extract the match data from the nested structure
    const match = matchResult.match
    const categories = match?.categories

    // Helper to safely round scores to integers
    const roundScore = (score: number | undefined | null): number | null => {
      if (score === undefined || score === null) return null
      return Math.round(score)
    }

    // Update job_candidates with match scores
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
      console.error("Error updating match scores:", updateError)
    }
  } catch (error) {
    console.error("Error in IMLRS matching:", error)
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
