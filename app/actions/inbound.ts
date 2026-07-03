'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { parseEmailConnectPayload } from '@/lib/email/emailconnect'
import { loadInboundAttachment } from '@/lib/email/attachments'
import { parseCvBuffer, isSupportedCvType, isUsableCandidate } from '@/lib/cv-parse'
import { consumeMatch } from '@/lib/quota'
import { scoreJobCandidateLink } from '@/lib/scoring'

/**
 * Manually assign a stored inbound email to a job. Re-parses the CV from the
 * saved webhook payload, creates the candidate in the chosen job, and scores it
 * (or queues it when over the match limit). RLS scopes every read/write to the
 * signed-in customer, so an email can never be assigned across customers.
 */
export async function assignInboundEmail(
  emailId: string,
  jobId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Nicht authentifiziert' }

  const { data: row } = await supabase
    .from('inbound_emails').select('id, raw').eq('id', emailId).single()
  if (!row) return { ok: false, error: 'E-Mail nicht gefunden' }

  const { data: job } = await supabase
    .from('jobs').select('id').eq('id', jobId).eq('user_id', user.id).single()
  if (!job) return { ok: false, error: 'Job nicht gefunden' }

  const email = parseEmailConnectPayload((row.raw as Record<string, unknown>) || {})
  const cvAtt = email.attachments.find(
    (a) => isSupportedCvType(a.mimeType, a.filename) && a.virusScan !== 'infected',
  )
  if (!cvAtt) return { ok: false, error: 'Kein verwertbarer Lebenslauf im Anhang' }

  const buffer = await loadInboundAttachment(cvAtt)
  if (!buffer) return { ok: false, error: 'Anhang nicht mehr verfügbar' }

  const parsed = await parseCvBuffer(buffer, cvAtt.mimeType, cvAtt.filename, email.text)
  if (!isUsableCandidate(parsed)) return { ok: false, error: 'Lebenslauf konnte nicht ausgelesen werden' }

  const { data: candidate, error: candErr } = await supabase
    .from('candidates')
    .insert({
      full_name: parsed.full_name,
      email: parsed.email,
      phone: parsed.phone,
      job_title: parsed.job_title,
      years_of_experience: Math.round(parsed.years_of_experience || 0),
      experience_level: parsed.experience_level || 'mid',
      skills: parsed.skills || [],
      education: parsed.education,
      summary_ai: parsed.summary_ai,
      location: parsed.location,
      user_id: user.id,
    })
    .select('id')
    .single()
  if (candErr || !candidate) return { ok: false, error: 'Kandidat konnte nicht angelegt werden' }

  const quota = await consumeMatch(supabase, user.id)
  const status = quota.allowed ? 'analyzing' : 'queued'
  const { data: link } = await supabase
    .from('job_candidates')
    .insert({ job_id: jobId, candidate_id: candidate.id, status, user_id: user.id })
    .select('id')
    .single()
  if (link && quota.allowed) await scoreJobCandidateLink(supabase, link.id)

  await supabase.from('inbound_emails').update({
    status: 'assigned',
    job_id: jobId,
    candidate_id: candidate.id,
    reason: quota.allowed ? null : 'Kontingent aufgebraucht',
  }).eq('id', emailId)

  revalidatePath('/inbox')
  revalidatePath('/candidates')
  revalidatePath('/dashboard')
  return { ok: true }
}
