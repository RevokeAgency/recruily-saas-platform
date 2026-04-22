import { createClient } from "@/lib/supabase/server"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params
    const supabase = await createClient()

    // Get all candidates linked to this job with their details
    const { data: jobCandidates, error } = await supabase
      .from("job_candidates")
      .select(`
        id,
        status,
        match_score,
        hard_skills_score,
        experience_score,
        education_score,
        soft_skills_score,
        languages_score,
        location_score,
        industry_score,
        salary_score,
        culture_score,
        career_prognosis,
        ai_summary,
        notes,
        created_at,
        candidate:candidates(
          id,
          full_name,
          email,
          phone,
          job_title,
          years_of_experience,
          experience_level,
          skills,
          education,
          summary_ai,
          location
        )
      `)
      .eq("job_id", jobId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching job candidates:", error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Transform the data to flatten candidate info
    const candidates = jobCandidates?.map((jc) => ({
      id: jc.candidate?.id,
      linkId: jc.id,
      full_name: jc.candidate?.full_name,
      email: jc.candidate?.email,
      phone: jc.candidate?.phone,
      job_title: jc.candidate?.job_title,
      years_of_experience: jc.candidate?.years_of_experience,
      experience_level: jc.candidate?.experience_level,
      skills: jc.candidate?.skills || [],
      education: jc.candidate?.education,
      summary_ai: jc.candidate?.summary_ai,
      location: jc.candidate?.location,
      status: jc.status,
      match_score: jc.match_score,
      hard_skills_score: jc.hard_skills_score,
      experience_score: jc.experience_score,
      education_score: jc.education_score,
      soft_skills_score: jc.soft_skills_score,
      languages_score: jc.languages_score,
      location_score: jc.location_score,
      industry_score: jc.industry_score,
      salary_score: jc.salary_score,
      culture_score: jc.culture_score,
      career_prognosis: jc.career_prognosis,
      ai_summary: jc.ai_summary,
      notes: jc.notes,
      added_at: jc.created_at,
    })) || []

    return Response.json({ candidates })
  } catch (error) {
    console.error("Error in job candidates API:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Add a candidate to a job
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params
    const supabase = await createClient()
    const body = await req.json()

    const { data, error } = await supabase
      .from("job_candidates")
      .insert({
        job_id: jobId,
        candidate_id: body.candidateId,
        status: body.status || "new",
        match_score: body.match_score,
        skills_score: body.skills_score,
        experience_score: body.experience_score,
        culture_score: body.culture_score,
        ai_summary: body.ai_summary,
      })
      .select()
      .single()

    if (error) {
      console.error("Error adding candidate to job:", error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ jobCandidate: data })
  } catch (error) {
    console.error("Error in job candidates API:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Remove a candidate from a job
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const linkId = searchParams.get("linkId")

    if (!linkId) {
      return Response.json({ error: "linkId is required" }, { status: 400 })
    }

    // Delete the job_candidates link (not the candidate itself)
    const { error } = await supabase
      .from("job_candidates")
      .delete()
      .eq("id", linkId)
      .eq("job_id", jobId) // Extra safety check

    if (error) {
      console.error("Error removing candidate from job:", error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error("Error in job candidates API:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
