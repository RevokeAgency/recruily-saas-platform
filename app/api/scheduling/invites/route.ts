import { after, type NextRequest } from "next/server"

import { createClient as createServer } from "@/lib/supabase/server"
import { createBookingToken } from "@/lib/scheduling/crypto"
import { adminClient, ensureDefaultMeetingType, loadMeetingTypes, loadProfile } from "@/lib/scheduling/store"
import { sendBookingInvite } from "@/lib/email/scheduling"
import { absoluteUrl } from "@/lib/site"

export const dynamic = "force-dynamic"

/** Wie lange ein Buchungslink gilt. Danach muss der Recruiter neu einladen. */
const INVITE_VALID_DAYS = 21

async function requireUser() {
  const supabase = await createServer()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

interface Body {
  jobCandidateId?: string
  meetingTypeId?: string
  note?: string
}

/** Offene Einladungen und Buchungen zu einer Bewerbung. */
export async function GET(req: NextRequest) {
  const user = await requireUser()
  if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

  const jobCandidateId = new URL(req.url).searchParams.get("jobCandidateId")
  if (!jobCandidateId) return Response.json({ invites: [], bookings: [] })

  const db = adminClient()
  const [invites, bookings] = await Promise.all([
    db.from("booking_invites")
      .select("id, status, expires_at, created_at, booking_id")
      .eq("user_id", user.id)
      .eq("job_candidate_id", jobCandidateId)
      .order("created_at", { ascending: false }),
    db.from("bookings")
      .select("id, starts_at, ends_at, status, timezone, meeting_url, location_kind, location_value")
      .eq("user_id", user.id)
      .eq("job_candidate_id", jobCandidateId)
      .order("starts_at", { ascending: false }),
  ])

  return Response.json({ invites: invites.data ?? [], bookings: bookings.data ?? [] })
}

/**
 * Erzeugt einen persönlichen Buchungslink für einen Bewerber und schickt ihn
 * per E-Mail. Der Klartext-Token verlässt die Anwendung genau einmal, nämlich
 * in dieser Mail; gespeichert wird nur der Abdruck.
 */
export async function POST(req: NextRequest) {
  const user = await requireUser()
  if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as Body
  if (!body.jobCandidateId) {
    return Response.json({ error: "Keine Bewerbung angegeben." }, { status: 400 })
  }

  const db = adminClient()

  // Bewerbung samt Stelle und Kandidat laden und dabei prüfen, dass sie dem
  // anfragenden Konto gehört.
  const { data: link, error: linkError } = await db
    .from("job_candidates")
    .select("id, job_id, candidate_id, jobs!inner(id, title, company, user_id), candidates!inner(id, full_name, email)")
    .eq("id", body.jobCandidateId)
    .single()

  if (linkError || !link) {
    return Response.json({ error: "Bewerbung nicht gefunden." }, { status: 404 })
  }

  const job = link.jobs as unknown as { id: string; title: string; company: string | null; user_id: string }
  const candidate = link.candidates as unknown as { id: string; full_name: string | null; email: string | null }

  if (job.user_id !== user.id) {
    return Response.json({ error: "Kein Zugriff auf diese Bewerbung." }, { status: 403 })
  }
  if (!candidate.email) {
    return Response.json(
      { error: "Für diesen Bewerber ist keine E-Mail-Adresse hinterlegt." },
      { status: 400 },
    )
  }

  const meetingTypes = await loadMeetingTypes(db, user.id)
  const chosen =
    meetingTypes.find((t) => t.id === body.meetingTypeId && t.active) ??
    meetingTypes.find((t) => t.isDefault && t.active) ??
    meetingTypes.find((t) => t.active) ??
    (await ensureDefaultMeetingType(db, user.id))

  if (!chosen) {
    return Response.json({ error: "Es ist keine Terminart eingerichtet." }, { status: 400 })
  }

  const profile = await loadProfile(db, user.id)
  const { token, hash } = createBookingToken()
  const expiresAt = new Date(Date.now() + INVITE_VALID_DAYS * 24 * 60 * 60 * 1000)

  // Ältere offene Einladungen zur selben Bewerbung zurückziehen, damit nicht
  // zwei Links parallel gültig sind.
  await db
    .from("booking_invites")
    .update({ status: "revoked" })
    .eq("user_id", user.id)
    .eq("job_candidate_id", link.id)
    .eq("status", "open")

  const { data: invite, error: inviteError } = await db
    .from("booking_invites")
    .insert({
      user_id: user.id,
      meeting_type_id: chosen.id,
      job_candidate_id: link.id,
      job_id: job.id,
      candidate_id: candidate.id,
      token_hash: hash,
      expires_at: expiresAt.toISOString(),
      candidate_name: candidate.full_name,
      candidate_email: candidate.email,
      job_title: job.title,
      company_name: job.company,
      personal_note: body.note?.trim() || null,
    })
    .select("id")
    .single()

  if (inviteError || !invite) {
    console.error("[scheduling] Einladung anlegen fehlgeschlagen:", inviteError)
    return Response.json({ error: "Konnte die Einladung nicht anlegen." }, { status: 500 })
  }

  const bookingUrl = absoluteUrl(`/termin/${token}`)

  // Statusfortschritt wie beim bisherigen Einladen, damit Kennzahlen und
  // Filter unverändert weiterlaufen.
  await db
    .from("job_candidates")
    .update({ status: "Eingeladen", invited_at: new Date().toISOString() })
    .eq("id", link.id)

  // Nach der Antwort versenden: Der Aufrufer wartet sonst auf den Mailserver.
  after(async () => {
    await sendBookingInvite({
      to: candidate.email!,
      candidateName: candidate.full_name,
      jobTitle: job.title,
      companyName: job.company,
      meetingTypeName: chosen.name,
      durationMinutes: chosen.durationMinutes,
      bookingUrl,
      personalNote: body.note ?? null,
      expiresAt,
      timezone: profile.timezone,
    })
  })

  return Response.json({ inviteId: invite.id, bookingUrl, expiresAt: expiresAt.toISOString() })
}
