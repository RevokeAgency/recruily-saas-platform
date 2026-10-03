import { NextRequest } from "next/server"

import { logDecisions } from "@/lib/compliance/decision-log"
import { mailProvider } from "@/lib/email/client"
import { sendReviewRequest } from "@/lib/email/review"
import { requireFeature } from "@/lib/quota"
import { consumeRateLimit } from "@/lib/rate-limit"
import { REVIEW_VALID_DAYS, linkState, parseCreateReview, verdictCounts } from "@/lib/review/shared"
import { createReviewToken, reviewDb, senderOf } from "@/lib/review/store"
import { absoluteUrl } from "@/lib/site"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * Freigabe-Links einer Stelle mit allen Urteilen, für HR. Lesen geht auch
 * nach einem Wechsel auf einen kleineren Plan, damit Rückmeldungen nicht
 * verschwinden.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

  const jobId = req.nextUrl.searchParams.get("jobId")
  if (!jobId) return Response.json({ error: "Keine Stelle angegeben." }, { status: 400 })

  const { data, error } = await supabase
    .from("review_links")
    .select("id, reviewer_name, reviewer_email, note, expires_at, revoked_at, first_opened_at, completed_at, created_at, items:review_link_items(id, job_candidate_id, verdict, comment, decided_at, position)")
    .eq("job_id", jobId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)

  // Ohne Migration 033 gibt es schlicht noch keine Links.
  if (error) return Response.json({ links: [], available: false })

  const links = (data ?? []).map((l) => {
    const items = ((l.items ?? []) as Array<{ id: string; job_candidate_id: string; verdict: string | null; comment: string | null; decided_at: string | null; position: number }>)
      .sort((a, b) => a.position - b.position)
    return {
      id: l.id as string,
      reviewerName: l.reviewer_name as string | null,
      reviewerEmail: l.reviewer_email as string | null,
      note: l.note as string | null,
      expiresAt: l.expires_at as string,
      createdAt: l.created_at as string,
      openedAt: l.first_opened_at as string | null,
      state: linkState({ expires_at: l.expires_at as string, revoked_at: l.revoked_at as string | null, completed_at: l.completed_at as string | null }),
      counts: verdictCounts(items),
      items: items.map((i) => ({
        jobCandidateId: i.job_candidate_id,
        verdict: i.verdict,
        comment: i.comment,
        decidedAt: i.decided_at,
      })),
    }
  })
  return Response.json({ links, available: true })
}

/**
 * Neuen Freigabe-Link anlegen und auf Wunsch per Mail verschicken. Ab Growth.
 * Der Link im Klartext kommt genau einmal zurück, gespeichert wird nur sein
 * Abdruck. Wer ihn verliert, legt einen neuen an.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

  const locked = await requireFeature(supabase, user.id, "review_link", "Freigabe-Links für Fachabteilungen")
  if (locked) return locked

  const parsed = parseCreateReview(await req.json().catch(() => ({})))
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 })
  const input = parsed.value

  const db = reviewDb()
  if (!db) return Response.json({ error: "Freigabe-Links sind gerade nicht verfügbar." }, { status: 503 })

  const grenze = await consumeRateLimit(db, "review_link_user", user.id, 30, 3600)
  if (!grenze.allowed) {
    return Response.json({ error: "Zu viele Freigabe-Links in kurzer Zeit. Bitte später erneut versuchen." }, { status: 429 })
  }

  // Stelle und Bewerbungen müssen dem Konto gehören und zusammenpassen.
  const { data: job } = await supabase
    .from("jobs").select("id, title, company").eq("id", input.jobId).eq("user_id", user.id).maybeSingle()
  if (!job) return Response.json({ error: "Stelle nicht gefunden." }, { status: 404 })

  const { data: links } = await supabase
    .from("job_candidates")
    .select("id")
    .eq("job_id", input.jobId)
    .eq("user_id", user.id)
    .in("id", input.jobCandidateIds)
  const valid = new Set((links ?? []).map((l) => l.id as string))
  const ids = input.jobCandidateIds.filter((id) => valid.has(id))
  if (ids.length !== input.jobCandidateIds.length) {
    return Response.json({ error: "Mindestens eine Bewerbung gehört nicht zu dieser Stelle." }, { status: 400 })
  }

  const { token, hash } = createReviewToken()
  const expiresAt = new Date(Date.now() + REVIEW_VALID_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data: link, error: linkErr } = await db
    .from("review_links")
    .insert({
      user_id: user.id,
      job_id: input.jobId,
      token_hash: hash,
      reviewer_name: input.reviewerName,
      reviewer_email: input.reviewerEmail,
      note: input.note,
      expires_at: expiresAt,
    })
    .select("id")
    .single()
  if (linkErr || !link) {
    console.error("[review-links] Anlegen fehlgeschlagen:", linkErr?.message)
    const missing = /review_links/.test(linkErr?.message ?? "")
    return Response.json(
      { error: missing ? "Freigabe-Links benötigen Migration 033_review_links.sql." : "Link konnte nicht angelegt werden." },
      { status: missing ? 503 : 500 },
    )
  }

  const { error: itemsErr } = await db.from("review_link_items").insert(
    ids.map((id, position) => ({ link_id: link.id, user_id: user.id, job_candidate_id: id, position })),
  )
  if (itemsErr) {
    await db.from("review_links").delete().eq("id", link.id)
    console.error("[review-links] Bewerber konnten nicht gespeichert werden:", itemsErr.message)
    return Response.json({ error: "Link konnte nicht angelegt werden." }, { status: 500 })
  }

  const url = absoluteUrl(`/freigabe/${token}`)

  let mailed = false
  if (input.reviewerEmail && mailProvider()) {
    const sender = await senderOf(db, user.id)
    mailed = await sendReviewRequest({
      to: input.reviewerEmail,
      reviewerName: input.reviewerName,
      senderName: sender.name,
      senderEmail: sender.email,
      company: (job.company as string) || sender.company || "",
      jobTitle: (job.title as string) || "die Stelle",
      count: ids.length,
      url,
      note: input.note,
      expiresAt,
    })
  }

  await logDecisions(supabase, ids.map((id) => ({
    userId: user.id, actorId: user.id, jobId: input.jobId, jobCandidateId: id,
    event: "an_fachbereich_gesendet", detail: { weg: input.reviewerEmail ? "mail" : "link" },
  })))

  return Response.json({ id: link.id, url, expiresAt, mailed })
}
