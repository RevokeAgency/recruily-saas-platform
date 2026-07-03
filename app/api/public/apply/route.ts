import { createClient } from "@supabase/supabase-js"
import { NextRequest } from "next/server"
import { consumeMatch } from "@/lib/quota"
import { scoreJobCandidateLink } from "@/lib/scoring"

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
      .select("id, user_id")
      .eq("id", jobId)
      .eq("is_active", true)
      .single()

    if (jobError || !job) {
      return Response.json({ error: "Job nicht gefunden oder inaktiv" }, { status: 404 })
    }

    const ownerId = job.user_id

    // Insert candidate scoped to the job owner — the applicant is NEVER lost,
    // even when the owner is over their monthly match limit.
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
      .select("id")
      .single()

    if (candidateError || !candidate) {
      console.error("[apply] Error creating candidate:", candidateError)
      return Response.json({ error: "Fehler beim Erstellen des Kandidaten" }, { status: 500 })
    }

    // Try to spend one of the owner's matches. If they are over their limit the
    // application is stored with status 'queued' (unscored) and picked up later
    // by the backfill once quota frees up (reset or upgrade).
    const quota = await consumeMatch(supabase, ownerId)
    const status = quota.allowed ? "analyzing" : "queued"

    const { data: link, error: linkError } = await supabase
      .from("job_candidates")
      .insert({
        job_id: jobId,
        candidate_id: candidate.id,
        status,
        user_id: ownerId,
      })
      .select("id")
      .single()

    if (linkError || !link) {
      console.error("[apply] Error linking candidate to job:", linkError)
      return Response.json({ error: "Fehler beim Verknüpfen" }, { status: 500 })
    }

    if (quota.allowed) {
      // Fire-and-forget scoring — do not block the applicant's response.
      scoreJobCandidateLink(supabase, link.id).catch((err) =>
        console.error("[apply] background scoring failed:", err)
      )
    }

    return Response.json({ success: true, candidateId: candidate.id, scored: quota.allowed })
  } catch (error) {
    console.error("[apply] Error in public apply:", error)
    return Response.json({ error: "Interner Serverfehler" }, { status: 500 })
  }
}
