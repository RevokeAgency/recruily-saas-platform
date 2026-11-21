import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient as createAdmin } from "@supabase/supabase-js"
import { after } from "next/server"
import { consumeMatch } from "@/lib/quota"
import { extractResumeText, scoreJobCandidateLink } from "@/lib/scoring"
import { duplicateMessage, findDuplicateInJob } from "@/lib/matching/duplicate"

// ─────────────────────────────────────────────────────────────────────────────
// Einen Kandidaten mit einer Stelle verknüpfen und das Matching starten.
//
// Gemeinsamer Weg für "Kandidat zu Stelle hinzufügen"
// (app/api/candidates/[id]/match) und Revy (gegen_stelle_matchen). Reihenfolge:
// erst alles prüfen, dann ein Match verbrauchen, dann verknüpfen. Eine
// abgelehnte oder doppelte Anfrage kostet so nie ein Match.
// ─────────────────────────────────────────────────────────────────────────────

export type LinkResult =
  | { ok: true; linkId: string }
  | { ok: false; status: number; body: Record<string, unknown> }

/**
 * Prüft Kandidat, Stelle, bestehende Verknüpfung und Dubletten mit dem
 * Client des Nutzers (RLS), verbraucht ein Match und legt die Verknüpfung an.
 * Das Matching selbst startet erst scoreLinkInBackground.
 */
export async function linkCandidateToJob(
  supabase: SupabaseClient,
  args: { ownerId: string; jobId: string; candidateId: string },
): Promise<LinkResult> {
  const { ownerId, jobId, candidateId } = args

  const { data: candidate, error: candidateError } = await supabase
    .from("candidates")
    .select("id, resume_text, resume_path")
    .eq("id", candidateId)
    .single()
  if (candidateError || !candidate) {
    return { ok: false, status: 404, body: { error: "Kandidat nicht gefunden" } }
  }

  const { data: job, error: jobError } = await supabase.from("jobs").select("id").eq("id", jobId).single()
  if (jobError || !job) {
    return { ok: false, status: 404, body: { error: "Job nicht gefunden" } }
  }

  const { data: existingLink } = await supabase
    .from("job_candidates")
    .select("id")
    .eq("job_id", jobId)
    .eq("candidate_id", candidateId)
    .single()
  if (existingLink) {
    return { ok: false, status: 400, body: { error: "Kandidat ist bereits mit diesem Job verknüpft" } }
  }

  // Derselbe Lebenslauf liegt schon in der Stelle (als anderer Kandidat,
  // etwa zweimal hochgeladen)? Dann kein zweites Matching: Es würde einen
  // zweiten, womöglich abweichenden Score für dieselbe Person liefern und
  // ein Match verbrauchen. Den Text dafür jetzt auslesen und speichern,
  // das Matching braucht ihn ohnehin.
  let resumeText: string | null = candidate.resume_text ?? null
  if (!resumeText && candidate.resume_path) {
    resumeText = await extractResumeText(candidate.resume_path)
    if (resumeText) {
      await supabase
        .from("candidates")
        .update({ resume_text: resumeText })
        .eq("id", candidateId)
        .then(({ error }) => {
          if (error) console.error("[match] resume_text skipped:", error.message)
        })
    }
  }
  const duplicate = await findDuplicateInJob(supabase, jobId, resumeText, candidateId)
  if (duplicate) {
    return {
      ok: false,
      status: 409,
      body: { error: duplicateMessage(duplicate), duplicate: true, existingLinkId: duplicate.linkId },
    }
  }

  // Atomically spend one match (row-locked, monthly-reset aware).
  const quota = await consumeMatch(supabase, ownerId)
  if (!quota.allowed) {
    return { ok: false, status: 403, body: { error: "match_limit_reached", used: quota.used, limit: quota.limit } }
  }

  const { data: linkData, error: linkError } = await supabase
    .from("job_candidates")
    .insert({ job_id: jobId, candidate_id: candidateId, status: "analyzing", user_id: ownerId })
    .select("id")
    .single()
  if (linkError || !linkData) {
    console.error("Error linking candidate to job:", linkError)
    return { ok: false, status: 500, body: { error: linkError?.message ?? "Fehler beim Verknüpfen" } }
  }
  return { ok: true, linkId: linkData.id }
}

/**
 * Matching NACH der Antwort. after() hält die Serverless-Funktion am Leben,
 * bis das Matching fertig ist; ein loses Promise wird auf Vercel nach der
 * Antwort eingefroren, die Kandidaten blieben dann in "analyzing" hängen. Die
 * Service-Rolle sorgt dafür, dass die Arbeit nicht vom Cookie-Kontext der
 * (dann beendeten) Anfrage abhängt.
 */
export function scoreLinkInBackground(linkId: string): void {
  after(async () => {
    try {
      const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
      })
      await scoreJobCandidateLink(admin, linkId)
    } catch (err) {
      console.error("[match] background scoring failed:", err)
    }
  })
}
