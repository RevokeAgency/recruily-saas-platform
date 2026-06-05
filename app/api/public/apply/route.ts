import { createClient } from "@supabase/supabase-js"
import { NextRequest } from "next/server"
import { runIMLRSMatch } from "@/lib/matching/imlrs"

// Service-role client — bypasses RLS for public application submissions.
// We scope every INSERT with the job owner's user_id explicitly.
function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set")
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { jobId, candidateData } = body

    if (!jobId || !candidateData?.full_name) {
      return Response.json({ error: "Fehlende Pflichtfelder" }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Fetch the job to get the owner's user_id
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id, title, company, location, description, required_skills, nice_to_have_skills, years_experience, education, languages, user_id")
      .eq("id", jobId)
      .eq("is_active", true)
      .single()

    if (jobError || !job) {
      return Response.json({ error: "Job nicht gefunden oder inaktiv" }, { status: 404 })
    }

    const ownerId = job.user_id

    // Insert candidate scoped to the job owner
    const { data: candidate, error: candidateError } = await supabase
      .from("candidates")
      .insert({
        full_name: candidateData.full_name,
        email: candidateData.email || null,
        phone: candidateData.phone || null,
        job_title: candidateData.job_title || null,
        years_of_experience: Math.round(candidateData.years_of_experience || 0),
        experience_level: candidateData.experience_level || "mid",
        skills: candidateData.skills || [],
        education: candidateData.education || null,
        summary_ai: candidateData.summary_ai || null,
        location: candidateData.location || null,
        user_id: ownerId,
      })
      .select()
      .single()

    if (candidateError || !candidate) {
      console.error("[v0] Error creating candidate from public apply:", candidateError)
      return Response.json({ error: "Fehler beim Erstellen des Kandidaten" }, { status: 500 })
    }

    // Create the job_candidates link
    const { data: link, error: linkError } = await supabase
      .from("job_candidates")
      .insert({
        job_id: jobId,
        candidate_id: candidate.id,
        status: "analyzing",
        user_id: ownerId,
      })
      .select("id")
      .single()

    if (linkError || !link) {
      console.error("[v0] Error linking candidate to job:", linkError)
      return Response.json({ error: "Fehler beim Verknüpfen" }, { status: 500 })
    }

    // Fire IMLRS match in background — do not block the response
    runIMLRSMatch(
      {
        id: candidate.id,
        name: candidate.full_name,
        skills: candidate.skills,
        experience: `${candidate.years_of_experience} years`,
        experienceLevel: candidate.experience_level,
        education: candidate.education,
        location: candidate.location,
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
      .then(async (match) => {
        const roundScore = (s: number | undefined | null) =>
          s == null ? null : Math.round(s)
        const cats = match?.categories
        await supabase
          .from("job_candidates")
          .update({
            status: "scored",
            match_score: roundScore(match?.overallScore),
            hard_skills_score: roundScore(cats?.hardSkills?.score),
            experience_score: roundScore(cats?.experience?.score),
            education_score: roundScore(cats?.education?.score),
            soft_skills_score: roundScore(cats?.softSkills?.score),
            languages_score: roundScore(cats?.languages?.score),
            location_score: roundScore(cats?.location?.score),
            industry_score: roundScore(cats?.industry?.score),
            salary_score: roundScore(cats?.salary?.score),
            culture_score: roundScore(cats?.culture?.score),
            career_prognosis: match?.careerPrognosis,
            ai_summary: match?.whyTheyFit?.join(" | "),
          })
          .eq("id", link.id)
      })
      .catch((err) => console.error("[v0] Public apply IMLRS match failed:", err))

    return Response.json({ success: true, candidateId: candidate.id })
  } catch (error) {
    console.error("[v0] Error in public apply:", error)
    return Response.json({ error: "Interner Serverfehler" }, { status: 500 })
  }
}
