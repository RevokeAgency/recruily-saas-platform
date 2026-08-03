import { createClient } from "@/lib/supabase/server"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params
    const supabase = await createClient()

    // Base columns present in every deployment.
    const baseColumns = `
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
        candidate:candidates(*)`

    const koColumns = "knockout, knockout_reasons"
    const interviewColumns = "interview_score, interview_completed_at"
    const matchV2Columns = "match_detail, match_engine"

    // Optional columns come from later migrations (019 KO, 020 interview,
    // 021 matching v2). Never let a pending migration break the whole list —
    // try the richest select and fall back progressively.
    const selects = [
      `${baseColumns}, ${koColumns}, ${interviewColumns}, ${matchV2Columns}`,
      `${baseColumns}, ${koColumns}, ${interviewColumns}`,
      `${baseColumns}, ${koColumns}`,
      baseColumns,
    ]
    let jobCandidates: Record<string, unknown>[] | null = null
    let error: { message?: string } | null = null
    for (const sel of selects) {
      const res = await supabase
        .from("job_candidates")
        .select(sel)
        .eq("job_id", jobId)
        .order("created_at", { ascending: false })
      if (!res.error) { jobCandidates = res.data as unknown as Record<string, unknown>[]; error = null; break }
      error = res.error
      if (!/knockout|interview_|match_detail|match_engine/i.test(res.error.message || "")) break // real error → stop
    }

    if (error) {
      console.error("Error fetching job candidates:", error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Transform the data to flatten candidate info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const candidates = jobCandidates?.map((jc: any) => ({
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
      photo_url: jc.candidate?.photo_url,
      resume_path: jc.candidate?.resume_path,
      cover_letter_path: jc.candidate?.cover_letter_path,
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
      knockout: jc.knockout ?? false,
      knockout_reasons: jc.knockout_reasons ?? [],
      interview_score: jc.interview_score ?? null,
      interview_completed_at: jc.interview_completed_at ?? null,
      match_detail: jc.match_detail ?? null,
      match_engine: jc.match_engine ?? null,
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
