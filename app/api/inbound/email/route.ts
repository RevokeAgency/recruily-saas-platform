import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { NextRequest } from "next/server"
import { parseEmailConnectPayload, verifyEmailConnectSignature } from "@/lib/email/emailconnect"
import { parseInboundRecipient } from "@/lib/email/routing"
import { parseCvBuffer, isSupportedCvType, isUsableCandidate, isPdfFile } from "@/lib/cv-parse"
import { consumeMatch } from "@/lib/quota"
import { scoreJobCandidateLink } from "@/lib/scoring"
import { extractCandidatePhoto } from "@/lib/cv-photo"
import { loadInboundAttachment } from "@/lib/email/attachments"

export const maxDuration = 60
export const dynamic = "force-dynamic"

function serviceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set")
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function POST(req: NextRequest) {
  // Read the raw body once — needed for HMAC verification.
  const rawBody = await req.text()

  // Auth: verify EmailConnect's HMAC signature when a secret is configured.
  // Without a secret (local/dev) we allow calls so the flow is testable with
  // simulated JSON — but we log it loudly.
  const secret = process.env.INBOUND_WEBHOOK_SECRET
  if (secret) {
    const sig =
      req.headers.get("x-emailconnect-signature") ||
      req.headers.get("x-signature") ||
      req.headers.get("x-webhook-signature")
    if (!verifyEmailConnectSignature(rawBody, sig, secret)) {
      return Response.json({ error: "invalid signature" }, { status: 401 })
    }
  } else {
    console.warn("[inbound] INBOUND_WEBHOOK_SECRET not set — signature check skipped (dev only)")
  }

  let raw: Record<string, unknown>
  try {
    raw = JSON.parse(rawBody)
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 })
  }

  const supabase = serviceClient()
  let emailRowId: string | null = null

  try {
    const email = parseEmailConnectPayload(raw)
    const { customerSlug, jobId } = parseInboundRecipient(email.to)

    // Resolve the customer (by slug) and the job (by UUID) independently.
    let ownerId: string | null = null
    if (customerSlug) {
      const { data: owner } = await supabase
        .from("user_profiles").select("id").eq("slug", customerSlug).single()
      ownerId = owner?.id ?? null
    }

    let job: { id: string; user_id: string } | null = null
    if (jobId) {
      const { data: j } = await supabase
        .from("jobs").select("id, user_id, is_active").eq("id", jobId).single()
      // Security: the job must belong to the customer named in the address.
      if (j && (!ownerId || j.user_id === ownerId)) {
        job = { id: j.id, user_id: j.user_id }
        ownerId = ownerId ?? j.user_id
      }
    }

    // Log the email up front so nothing is ever lost, scoped to the customer
    // (RLS makes it visible only to them; unresolved => visible to nobody).
    const { data: logRow } = await supabase
      .from("inbound_emails")
      .insert({
        user_id: ownerId,
        job_id: job?.id ?? null,
        from_address: email.from,
        to_address: email.to,
        subject: email.subject,
        body_text: email.text,
        status: "received",
        attachments: email.attachments.map((a) => ({
          filename: a.filename, mimeType: a.mimeType, size: a.size, virusScan: a.virusScan,
        })),
        raw,
      })
      .select("id")
      .single()
    emailRowId = logRow?.id ?? null

    const finalize = async (status: string, reason?: string, candidateId?: string) => {
      if (!emailRowId) return
      await supabase.from("inbound_emails")
        .update({ status, reason: reason ?? null, candidate_id: candidateId ?? null })
        .eq("id", emailRowId)
    }

    // No matching active job → "Nicht zugeordnet".
    if (!job) {
      await finalize("unassigned", jobId ? "Job nicht gefunden" : "Keine Job-ID in Adresse")
      return Response.json({ success: true, status: "unassigned" })
    }

    // Pick the first usable, non-infected CV attachment.
    const cvAtt = email.attachments.find(
      (a) => isSupportedCvType(a.mimeType, a.filename) && a.virusScan !== "infected",
    )
    if (!cvAtt) {
      await finalize("no_cv", "Kein verwertbarer Lebenslauf im Anhang")
      return Response.json({ success: true, status: "no_cv" })
    }

    const buffer = await loadInboundAttachment(cvAtt)
    if (!buffer) {
      await finalize("error", "Anhang konnte nicht geladen werden")
      return Response.json({ success: true, status: "error" })
    }

    const parsed = await parseCvBuffer(buffer, cvAtt.mimeType, cvAtt.filename, email.text)
    if (!isUsableCandidate(parsed)) {
      await finalize("no_cv", "Lebenslauf konnte nicht ausgelesen werden")
      return Response.json({ success: true, status: "no_cv" })
    }

    // Create the candidate scoped to the job owner (never derived from the
    // untrusted address alone — ownerId came from the resolved job).
    const { data: candidate, error: candErr } = await supabase
      .from("candidates")
      .insert({
        full_name: parsed.full_name,
        email: parsed.email,
        phone: parsed.phone,
        job_title: parsed.job_title,
        years_of_experience: Math.round(parsed.years_of_experience || 0),
        experience_level: parsed.experience_level || "mid",
        skills: parsed.skills || [],
        education: parsed.education,
        summary_ai: parsed.summary_ai,
        location: parsed.location,
        cover_letter_text: email.text || null,
        user_id: job.user_id,
      })
      .select("id")
      .single()

    if (candErr || !candidate) {
      await finalize("error", "Kandidat konnte nicht angelegt werden")
      return Response.json({ success: true, status: "error" })
    }

    // Store the CV and (best-effort) extract a profile photo. Non-fatal.
    try {
      const ext = cvAtt.filename?.split(".").pop()?.toLowerCase() || "pdf"
      const resumePath = `${job.user_id}/${candidate.id}/cv.${ext}`
      await supabase.storage.from("resumes").upload(resumePath, buffer, {
        contentType: cvAtt.mimeType || "application/pdf", upsert: true,
      })
      let photoUrl: string | null = null
      if (isPdfFile(cvAtt.mimeType, cvAtt.filename)) {
        const photo = await extractCandidatePhoto(buffer)
        if (photo) {
          const photoPath = `${job.user_id}/${candidate.id}.jpg`
          const { error: pErr } = await supabase.storage.from("candidate-photos").upload(photoPath, photo, {
            contentType: "image/jpeg", upsert: true,
          })
          if (!pErr) photoUrl = supabase.storage.from("candidate-photos").getPublicUrl(photoPath).data.publicUrl
        }
      }
      await supabase.from("candidates").update({ resume_path: resumePath, photo_url: photoUrl }).eq("id", candidate.id)
    } catch (err) {
      console.error("[inbound] document/photo storage failed:", err)
    }

    // Spend a match if quota allows; otherwise store unscored ('queued').
    const quota = await consumeMatch(supabase, job.user_id)
    const status = quota.allowed ? "analyzing" : "queued"

    const { data: link } = await supabase
      .from("job_candidates")
      .insert({ job_id: job.id, candidate_id: candidate.id, status, user_id: job.user_id, source: "email" })
      .select("id")
      .single()

    if (link && quota.allowed) {
      scoreJobCandidateLink(supabase, link.id).catch((err) =>
        console.error("[inbound] scoring failed:", err),
      )
    }

    await finalize("assigned", quota.allowed ? undefined : "Kontingent aufgebraucht", candidate.id)
    return Response.json({ success: true, status: "assigned", candidateId: candidate.id, scored: quota.allowed })
  } catch (error) {
    console.error("[inbound] unexpected error:", error)
    if (emailRowId) {
      await supabase.from("inbound_emails").update({ status: "error", reason: "Interner Fehler" }).eq("id", emailRowId)
    }
    // Return 200 so the provider does not retry-storm a poison message.
    return Response.json({ success: false, status: "error" })
  }
}
