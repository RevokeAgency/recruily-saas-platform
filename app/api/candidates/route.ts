import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: candidates, error } = await supabase
      .from("candidates")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching candidates:", error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ candidates })
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

      // Fire IMLRS matching in the background (don't await - let it run async)
      if (linkId) {
        triggerIMLRSMatch(body.jobId, candidate.id, linkId, candidateData)
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

    // Call the match API
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    const matchResponse = await fetch(`${baseUrl}/api/match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidate: {
          id: candidateId,
          name: candidateData.full_name,
          skills: candidateData.skills,
          experience: `${candidateData.years_of_experience} years`,
          experienceLevel: candidateData.experience_level,
          education: candidateData.education,
          location: candidateData.location,
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
        match_score: roundScore(matchResult.overallScore),
        hard_skills_score: roundScore(matchResult.scores?.hardSkills),
        experience_score: roundScore(matchResult.scores?.experience),
        education_score: roundScore(matchResult.scores?.education),
        soft_skills_score: roundScore(matchResult.scores?.softSkills),
        languages_score: roundScore(matchResult.scores?.languages),
        location_score: roundScore(matchResult.scores?.location),
        industry_score: roundScore(matchResult.scores?.industry),
        salary_score: roundScore(matchResult.scores?.salary),
        culture_score: roundScore(matchResult.scores?.culture),
        career_prognosis: matchResult.careerPrognosis?.trend,
        ai_summary: matchResult.contextualPitch?.join(" | "),
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
