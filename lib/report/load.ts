import type { SupabaseClient } from "@supabase/supabase-js"

import { PHOTO_BUCKET, candidatePhotoPath } from "@/lib/candidate-photo"
import { isPdfImage, prepareLogo } from "./image"
import { buildReportCandidate, rankCandidates, type ReportData, type ReportRequest } from "./model"

// ─────────────────────────────────────────────────────────────────────────────
// Revetly Report: Daten aus der Datenbank holen (nur Server).
//
// Bewerbungen und Stelle kommen über den Client des angemeldeten Kontos, also
// mit RLS und user_id-Filter. Fotos und Logo liest der Server mit
// service_role, weil die Speicher privat sind beziehungsweise das PDF die
// Bilddaten selbst braucht.
// ─────────────────────────────────────────────────────────────────────────────

const ROW_SELECT =
  "id, match_score, knockout, knockout_reasons, ai_summary, career_prognosis, match_detail, " +
  "hard_skills_score, experience_score, education_score, soft_skills_score, languages_score, " +
  "location_score, industry_score, salary_score, culture_score, " +
  "interview_guide, interview_ratings, interview_score, interview_notes, " +
  "candidate:candidates(id, full_name, email, phone, job_title, location, years_of_experience, experience_level, skills, education, summary_ai, dossier, photo_url)"

/** Logo des Kunden laden, Rand abschneiden, als PNG (lib/report/image.ts). */
async function fetchLogo(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    return buf.length < 5_000_000 ? await prepareLogo(buf) : null
  } catch {
    return null
  }
}

export type LoadResult =
  | { ok: true; data: ReportData }
  | { ok: false; status: number; error: string }

export async function loadReport(
  supabase: SupabaseClient,
  admin: SupabaseClient | null,
  userId: string,
  req: ReportRequest,
): Promise<LoadResult> {
  const { data: job } = await supabase
    .from("jobs").select("id, title, company, location").eq("id", req.jobId).eq("user_id", userId).maybeSingle()
  if (!job) return { ok: false, status: 404, error: "Stelle nicht gefunden." }

  // Fehlen Spalten aus späteren Migrationen (Interview, match_detail), mit
  // dem Kern weitermachen statt abzubrechen.
  let { data: rows, error } = await supabase
    .from("job_candidates").select(ROW_SELECT).eq("job_id", req.jobId).eq("user_id", userId).in("id", req.jobCandidateIds)
  if (error && /interview_|match_detail|dossier/.test(error.message)) {
    const fallback = await supabase
      .from("job_candidates")
      .select(ROW_SELECT.replace(/interview_guide, interview_ratings, interview_score, interview_notes, /, "").replace(/match_detail, /, "").replace(/, dossier/, ""))
      .eq("job_id", req.jobId).eq("user_id", userId).in("id", req.jobCandidateIds)
    rows = fallback.data
    error = fallback.error
  }
  if (error) return { ok: false, status: 500, error: "Kandidaten konnten nicht geladen werden." }
  if (!rows || rows.length !== req.jobCandidateIds.length) {
    return { ok: false, status: 400, error: "Mindestens ein Kandidat gehört nicht zu dieser Stelle." }
  }

  const { data: profile } = await supabase.from("user_profiles").select("*").eq("id", userId).maybeSingle()
  const p = (profile ?? {}) as Record<string, unknown>
  const issuer = (typeof p.company_name === "string" && p.company_name.trim()) || (job.company as string) || ""
  const logo = typeof p.logo_url === "string" && p.logo_url ? await fetchLogo(p.logo_url) : null

  const candidates = await Promise.all(
    (rows as unknown as Record<string, unknown>[]).map(async (row) => {
      const c = buildReportCandidate(row, req.anonymous)
      const cand = (Array.isArray(row.candidate) ? row.candidate[0] : row.candidate) as { id?: string; photo_url?: string | null } | null
      if (!req.anonymous && admin && cand?.id && cand.photo_url) {
        const { data } = await admin.storage.from(PHOTO_BUCKET).download(candidatePhotoPath(userId, cand.id))
        if (data) {
          const buf = Buffer.from(await data.arrayBuffer())
          if (isPdfImage(buf)) c.photo = buf
        }
      }
      return c
    }),
  )

  return {
    ok: true,
    data: {
      anonymous: req.anonymous,
      sections: req.sections,
      jobTitle: (job.title as string) || "Stelle",
      jobLocation: (job.location as string | null) ?? null,
      issuer,
      logo,
      createdAt: new Date(),
      candidates: rankCandidates(candidates),
    },
  }
}
