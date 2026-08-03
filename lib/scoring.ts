import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient as createAdmin } from "@supabase/supabase-js"
import { runIMLRSMatch } from "@/lib/matching/imlrs"
import { extractCandidatePhoto } from "@/lib/cv-photo"
import { extractDocumentText } from "@/lib/cv-parse"

const roundScore = (s: number | undefined | null): number | null =>
  s == null ? null : Math.round(s)

/**
 * Downloads the stored CV and extracts its full text (IMLRS 2.0 input).
 * Best-effort — returns null on any failure, never throws.
 */
async function extractResumeText(resumePath: string): Promise<string | null> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return null
    const admin = createAdmin(url, key, { auth: { persistSession: false } })
    const { data: file } = await admin.storage.from("resumes").download(resumePath)
    if (!file) return null
    const buf = Buffer.from(await file.arrayBuffer())
    const text = await extractDocumentText(buf, null, resumePath)
    return text?.trim() ? text : null
  } catch (err) {
    console.error("[scoring] resume text extraction skipped:", err)
    return null
  }
}

/**
 * Self-heals a missing profile photo: if the candidate has a PDF CV but no
 * stored photo, extract it now and save it. Best-effort — never throws, never
 * blocks scoring. Uses a service-role client for the private-bucket download +
 * public-bucket upload, so it works from any scoring context (incl. re-scoring
 * candidates that were added before photo extraction was fixed).
 */
async function backfillCandidatePhoto(candidate: {
  id: string
  user_id?: string | null
  photo_url?: string | null
  resume_path?: string | null
}): Promise<void> {
  try {
    if (candidate.photo_url) return
    const path = candidate.resume_path
    if (!path || !path.toLowerCase().endsWith(".pdf") || !candidate.user_id) return

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return
    const admin = createAdmin(url, key, { auth: { persistSession: false } })

    const { data: file } = await admin.storage.from("resumes").download(path)
    if (!file) return
    const photo = await extractCandidatePhoto(Buffer.from(await file.arrayBuffer()))
    if (!photo) return

    const photoPath = `${candidate.user_id}/${candidate.id}.png`
    const { error } = await admin.storage.from("candidate-photos").upload(photoPath, photo, {
      contentType: "image/png", upsert: true,
    })
    if (error) return
    const publicUrl = admin.storage.from("candidate-photos").getPublicUrl(photoPath).data.publicUrl
    await admin.from("candidates").update({ photo_url: publicUrl }).eq("id", candidate.id)
  } catch (err) {
    console.error("[scoring] photo backfill skipped:", err)
  }
}

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
      .select("id, job_id, candidate_id, user_id")
      .eq("id", linkId)
      .single()
    if (!link) return

    // Tenant-calibrated IMLRS weights (nightly cron, migration 022). Missing
    // column or row → defaults; runIMLRSMatch re-validates the bounds anyway.
    let tenantWeights: Record<string, number> | null = null
    if (link.user_id) {
      const { data: prof } = await supabase
        .from("user_profiles")
        .select("imlrs_weights")
        .eq("id", link.user_id)
        .single()
      tenantWeights = (prof?.imlrs_weights as Record<string, number> | null) ?? null
    }

    const [{ data: job }, { data: candidate }] = await Promise.all([
      supabase.from("jobs").select("*").eq("id", link.job_id).single(),
      supabase.from("candidates").select("*").eq("id", link.candidate_id).single(),
    ])

    if (!job || !candidate) {
      await supabase.from("job_candidates").update({ status: "error" }).eq("id", linkId)
      return
    }

    // IMLRS 2.0 works from the FULL CV text. If it isn't stored yet (candidate
    // predates migration 021 or arrived via an older path), extract it now from
    // the stored PDF/DOCX and persist it for every future match.
    let resumeText: string | null = candidate.resume_text ?? null
    if (!resumeText && candidate.resume_path) {
      resumeText = await extractResumeText(candidate.resume_path)
      if (resumeText) {
        await supabase
          .from("candidates")
          .update({ resume_text: resumeText })
          .eq("id", candidate.id)
          .then(({ error }) => {
            if (error) console.error("[scoring] resume_text skipped:", error.message)
          })
      }
    }

    const match = await runIMLRSMatch(
      {
        id: candidate.id,
        name: candidate.full_name,
        job_title: candidate.job_title,
        skills: candidate.skills,
        experience: `${candidate.years_of_experience} years`,
        experienceLevel: candidate.experience_level,
        years_of_experience: candidate.years_of_experience,
        education: candidate.education,
        location: candidate.location,
        summary_ai: candidate.summary_ai,
        cover_letter_text: candidate.cover_letter_text ?? null,
        resume_text: resumeText,
        dossier: candidate.dossier ?? null, // cached Stage A from a previous match
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
        languages: job.languages || [],
        ko_criteria: job.ko_criteria || [],
      },
      { weights: tenantWeights },
    )

    // Cache the freshly built dossier on the candidate (reused across jobs).
    if (match.dossier) {
      await supabase
        .from("candidates")
        .update({ dossier: match.dossier, dossier_updated_at: new Date().toISOString() })
        .eq("id", candidate.id)
        .then(({ error }) => {
          if (error) console.error("[scoring] dossier cache skipped:", error.message)
        })
    }

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

    // KO result is written separately and best-effort so a pending migration
    // (019_ko_criteria) can never break the core scoring update.
    await supabase
      .from("job_candidates")
      .update({
        knockout: match?.knockout ?? false,
        knockout_reasons: match?.knockoutReasons ?? [],
      })
      .eq("id", linkId)
      .then(({ error }) => {
        if (error) console.error("[scoring] knockout skipped:", error.message)
      })

    // Full reasoning trail (Begründungen, Belege, Konfidenz, Hard Facts,
    // Prüf-Urteile) — best-effort until migration 021 is applied.
    await supabase
      .from("job_candidates")
      .update({ match_detail: match.detail, match_engine: match.detail.engine })
      .eq("id", linkId)
      .then(({ error }) => {
        if (error) console.error("[scoring] match_detail skipped:", error.message)
      })

    // Self-heal a missing profile photo (e.g. candidate added before photo
    // extraction was fixed). Best-effort; runs only when no photo is stored.
    await backfillCandidatePhoto(candidate)
  } catch (err) {
    console.error("scoreJobCandidateLink failed:", err)
    await supabase.from("job_candidates").update({ status: "error" }).eq("id", linkId)
  }
}
