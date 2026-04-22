import { createClient } from "@/lib/supabase/server"
import { calculateIMLRSMatch } from "@/lib/imlrs-service"

export const maxDuration = 60 // Allow up to 60 seconds for AI processing

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
  console.log("[v0] POST /api/candidates called")
  try {
    const supabase = await createClient()
    const body = await req.json()
    console.log("[v0] Request body jobId:", body.jobId, "name:", body.full_name)

    const candidateData = {
      full_name: body.full_name,
      email: body.email || null,
      phone: body.phone || null,
      job_title: body.job_title || null,
      years_of_experience: Math.round(body.years_of_experience || 0),
      experience_level: body.experience_level || "mid",
      skills: body.skills || [],
      education: body.education || null,
      summary_ai: body.summary_ai || null,
      location: body.location || null,
    }

    // Create the candidate
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

    // If a jobId was provided, create the link and run IMLRS matching
    if (body.jobId && candidate) {
      // Create the job_candidates link with "analyzing" status
      const { data: linkData, error: linkError } = await supabase
        .from("job_candidates")
        .insert({
          job_id: body.jobId,
          candidate_id: candidate.id,
          status: "analyzing",
        })
        .select("id")
        .single()

      if (linkError) {
        console.error("Error linking candidate to job:", linkError)
      } else {
        linkId = linkData?.id
      }

      // Run IMLRS matching directly (no HTTP call)
      if (linkId) {
        console.log("[v0] Starting IMLRS matching for linkId:", linkId)
        
        // Get job data
        const { data: job, error: jobError } = await supabase
          .from("jobs")
          .select("*")
          .eq("id", body.jobId)
          .single()

        if (jobError || !job) {
          console.error("Error fetching job:", jobError)
          await supabase
            .from("job_candidates")
            .update({ status: "error" })
            .eq("id", linkId)
        } else {
          // Calculate IMLRS match directly
          const match = await calculateIMLRSMatch(candidateData, job)

          if (match) {
            // Helper to safely round scores
            const roundScore = (score: number | undefined | null): number | null => {
              if (score === undefined || score === null) return null
              return Math.round(score)
            }

            // Update job_candidates with match scores
            const { error: updateError } = await supabase
              .from("job_candidates")
              .update({
                status: "scored",
                match_score: roundScore(match.overallScore),
                hard_skills_score: roundScore(match.categories.hardSkills.score),
                experience_score: roundScore(match.categories.experience.score),
                education_score: roundScore(match.categories.education.score),
                soft_skills_score: roundScore(match.categories.softSkills.score),
                languages_score: roundScore(match.categories.languages.score),
                location_score: roundScore(match.categories.location.score),
                industry_score: roundScore(match.categories.industry.score),
                salary_score: roundScore(match.categories.salary.score),
                culture_score: roundScore(match.categories.culture.score),
                career_prognosis: match.careerPrognosis,
                prognosis_reason: match.prognosisReason,
                ai_summary: match.whyTheyFit?.join(" | "),
                potential_concerns: match.potentialConcerns?.join(" | "),
                interview_focus: match.interviewFocus,
              })
              .eq("id", linkId)

            if (updateError) {
              console.error("[v0] Error updating match scores:", updateError)
            } else {
              console.log("[v0] IMLRS match saved successfully, score:", match.overallScore)
            }
          } else {
            console.error("[v0] IMLRS calculation returned null")
            // IMLRS calculation failed
            await supabase
              .from("job_candidates")
              .update({ status: "error" })
              .eq("id", linkId)
          }
        }
      }
    }

    return Response.json({ candidate, linkId })
  } catch (error) {
    console.error("Error in candidates API:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
