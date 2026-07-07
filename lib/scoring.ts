import type { SupabaseClient } from "@supabase/supabase-js"
import { runIMLRSMatch } from "@/lib/matching/imlrs"

const roundScore = (s: number | undefined | null): number | null =>
  s == null ? null : Math.round(s)

/**
 * Scores a single job_candidates link in place: loads the linked job +
 * candidate, runs the IMLRS match, and writes the 9-category scores + status
 * back. Sets status 'scored' on success, 'error' on failure. Works with an
 * authenticated client (owner) or the service-role client (inbound apply).
 *
 * The quota must already have been consumed by the caller — this function only
 * scores; it never touches the match counter.
 */
export async function scoreJobCandidateLink(
  supabase: SupabaseClient,
  linkId: string,
): Promise<void> {
  try {
    const { data: link } = await supabase
      .from("job_candidates")
      .select("id, job_id, candidate_id")
      .eq("id", linkId)
      .single()
    if (!link) return

    const [{ data: job }, { data: candidate }] = await Promise.all([
      supabase.from("jobs").select("*").eq("id", link.job_id).single(),
      supabase.from("candidates").select("*").eq("id", link.candidate_id).single(),
    ])

    if (!job || !candidate) {
      await supabase.from("job_candidates").update({ status: "error" }).eq("id", linkId)
      return
    }

    const match = await runIMLRSMatch(
      {
        id: candidate.id,
        name: candidate.full_name,
        skills: candidate.skills,
        experience: `${candidate.years_of_experience} years`,
        experienceLevel: candidate.experience_level,
        education: candidate.education,
        location: candidate.location,
        summary_ai: candidate.summary_ai,
        cover_letter_text: candidate.cover_letter_text ?? null,
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
      },
    )

    const c = match?.categories
    await supabase
      .from("job_candidates")
      .update({
        status: "scored",
        match_score: roundScore(match?.overallScore),
        hard_skills_score: roundScore(c?.hardSkills?.score),
        experience_score: roundScore(c?.experience?.score),
        education_score: roundScore(c?.education?.score),
        soft_skills_score: roundScore(c?.softSkills?.score),
        languages_score: roundScore(c?.languages?.score),
        location_score: roundScore(c?.location?.score),
        industry_score: roundScore(c?.industry?.score),
        salary_score: roundScore(c?.salary?.score),
        culture_score: roundScore(c?.culture?.score),
        career_prognosis: match?.careerPrognosis,
        ai_summary: match?.whyTheyFit?.join(" | "),
      })
      .eq("id", linkId)
  } catch (err) {
    console.error("scoreJobCandidateLink failed:", err)
    await supabase.from("job_candidates").update({ status: "error" }).eq("id", linkId)
  }
}
