import { after, type NextRequest } from "next/server"

import { computeSlots, isSlotStillFree } from "@/lib/scheduling/availability"
import { cancelBooking, createBooking, refreshNextInterview, type BookingRow } from "@/lib/scheduling/booking"
import { hashBookingToken } from "@/lib/scheduling/crypto"
import {
  sendBookingCancellation,
  sendBookingConfirmation,
  sendRecruiterBookingNotice,
} from "@/lib/email/scheduling"
import { adminClient, collectBusy, loadMeetingTypes, loadProfile } from "@/lib/scheduling/store"
import type { MeetingType } from "@/lib/scheduling/types"
import { consumeRateLimit, requesterKey, tooManyRequests } from "@/lib/rate-limit"
import { absoluteUrl } from "@/lib/site"

export const dynamic = "force-dynamic"
// Ein Buchungsvorgang schreibt in zwei Systeme und verschickt Mails.
export const maxDuration = 60

interface InviteRow {
  id: string
  user_id: string
  meeting_type_id: string | null
  job_candidate_id: string | null
  job_id: string | null
  candidate_id: string | null
  expires_at: string
  status: string
  booking_id: string | null
  candidate_name: string | null
  candidate_email: string | null
  job_title: string | null
  company_name: string | null
  personal_note: string | null
}

/**
 * Löst den Buchungslink auf. Der Token selbst wird nie gespeichert, gesucht
 * wird über seinen Abdruck.
 */
async function resolveInvite(token: string): Promise<
  | { invite: InviteRow; meetingType: MeetingType }
  | { error: string; status: number }
> {
  if (!token || token.length < 20) return { error: "Dieser Link ist ungültig.", status: 404 }

  const db = adminClient()
  const { data, error } = await db
    .from("booking_invites")
    .select("*")
    .eq("token_hash", hashBookingToken(token))
    .maybeSingle()

  if (error || !data) return { error: "Dieser Link ist ungültig.", status: 404 }

  const invite = data as InviteRow
  if (invite.status === "revoked") {
    return { error: "Dieser Link wurde zurückgezogen. Bitte melden Sie sich beim Unternehmen.", status: 410 }
  }
  if (new Date(invite.expires_at).getTime() < Date.now() && invite.status !== "booked") {
    return { error: "Dieser Link ist abgelaufen. Bitte melden Sie sich beim Unternehmen.", status: 410 }
  }

  const meetingTypes = await loadMeetingTypes(db, invite.user_id)
  const meetingType =
    meetingTypes.find((t) => t.id === invite.meeting_type_id) ??
    meetingTypes.find((t) => t.isDefault && t.active) ??
    meetingTypes.find((t) => t.active)

  if (!meetingType) return { error: "Es steht gerade keine Terminart bereit.", status: 409 }
  return { invite, meetingType }
}

async function loadBooking(bookingId: string): Promise<BookingRow | null> {
  const { data } = await adminClient().from("bookings").select("*").eq("id", bookingId).maybeSingle()
  return (data as BookingRow) ?? null
}

function publicBooking(booking: BookingRow) {
  return {
    id: booking.id,
    startsAt: booking.starts_at,
    endsAt: booking.ends_at,
    timezone: booking.timezone,
    status: booking.status,
    meetingUrl: booking.meeting_url,
    locationKind: booking.location_kind,
    locationValue: booking.location_value,
  }
}

/**
 * Zustand der Buchungsseite. Mit `?slots=1` kommen zusätzlich die freien
 * Termine, damit die Seite beim Wechsel des Zeitraums nachladen kann.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const resolved = await resolveInvite(token)
  if ("error" in resolved) {
    return Response.json({ error: resolved.error }, { status: resolved.status })
  }

  const { invite, meetingType } = resolved
  const db = adminClient()
  const profile = await loadProfile(db, invite.user_id)

  const existing = invite.booking_id ? await loadBooking(invite.booking_id) : null
  const activeBooking = existing && existing.status === "confirmed" ? existing : null

  const url = new URL(req.url)
  const wantsSlots = url.searchParams.get("slots") !== "0"

  const base = {
    meetingType: {
      name: meetingType.name,
      description: meetingType.description,
      durationMinutes: meetingType.durationMinutes,
      locationKind: meetingType.locationKind,
      locationValue: meetingType.locationKind === "onsite" ? meetingType.locationValue : null,
    },
    candidateName: invite.candidate_name,
    jobTitle: invite.job_title,
    companyName: invite.company_name,
    personalNote: invite.personal_note,
    timezone: profile.timezone,
    // Der Bewerber gibt eine Nummer an, wenn der Recruiter anruft.
    needsPhone: meetingType.locationKind === "phone",
    booking: activeBooking ? publicBooking(activeBooking) : null,
  }

  if (!wantsSlots || activeBooking) return Response.json({ ...base, days: [] })

  const from = new Date()
  const to = new Date(from.getTime() + profile.maxDaysAhead * 24 * 60 * 60 * 1000)
  const { busy, degraded } = await collectBusy(db, invite.user_id, from, to, profile.timezone)

  const days = computeSlots({
    profile,
    durationMinutes: meetingType.durationMinutes,
    busy,
    from,
    to,
  })

  return Response.json({ ...base, days, degraded })
}

interface PostBody {
  action?: "book" | "cancel"
  start?: string
  name?: string
  email?: string
  phone?: string
  note?: string
  reason?: string
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const resolved = await resolveInvite(token)
  if ("error" in resolved) {
    return Response.json({ error: resolved.error }, { status: resolved.status })
  }

  const { invite, meetingType } = resolved
  const db = adminClient()

  // Der Token ist zwar nicht zu erraten, aber wer ihn hat, kann sonst beliebig
  // oft buchen und absagen und damit Mail und Kalendereinträge auslösen.
  const proToken = await consumeRateLimit(db, "booking_token", invite.id, 12, 3600)
  if (!proToken.allowed) {
    return tooManyRequests(proToken, "Zu viele Änderungen in kurzer Zeit. Bitte versuche es später noch einmal.")
  }
  const proAbsender = await consumeRateLimit(db, "booking_ip", requesterKey(req), 30, 3600)
  if (!proAbsender.allowed) {
    return tooManyRequests(proAbsender, "Zu viele Anfragen. Bitte versuche es später noch einmal.")
  }

  const body = (await req.json().catch(() => ({}))) as PostBody
  const manageUrl = absoluteUrl(`/termin/${token}`)

  // ── Absagen ───────────────────────────────────────────────────────────────
  if (body.action === "cancel") {
    if (!invite.booking_id) return Response.json({ error: "Es gibt nichts abzusagen." }, { status: 400 })
    const booking = await loadBooking(invite.booking_id)
    if (!booking || booking.status !== "confirmed") {
      return Response.json({ error: "Dieser Termin ist bereits abgesagt." }, { status: 409 })
    }

    await cancelBooking(db, booking, "candidate", body.reason)
    // Der Link wird wieder buchbar, damit der Bewerber gleich umbuchen kann.
    await db
      .from("booking_invites")
      .update({ status: "open", booking_id: null })
      .eq("id", invite.id)

    const recruiterEmail = await recruiterAddress(invite.user_id)
    const profile = await loadProfile(db, invite.user_id)

    after(async () => {
      const ctx = {
        bookingId: booking.id,
        start: new Date(booking.starts_at),
        end: new Date(booking.ends_at),
        timezone: booking.timezone || profile.timezone,
        meetingTypeName: meetingType.name,
        locationKind: booking.location_kind,
        locationValue: booking.location_value,
        meetingUrl: booking.meeting_url,
        jobTitle: invite.job_title,
        companyName: invite.company_name,
        candidateName: invite.candidate_name,
        candidateEmail: invite.candidate_email,
        recruiterEmail,
      }
      if (recruiterEmail) {
        await sendBookingCancellation(ctx, { to: recruiterEmail, byRecruiter: false, reason: body.reason })
      }
      if (invite.candidate_email) {
        await sendBookingCancellation(ctx, {
          to: invite.candidate_email,
          byRecruiter: false,
          rebookUrl: manageUrl,
        })
      }
    })

    return Response.json({ ok: true, booking: null })
  }

  // ── Buchen ────────────────────────────────────────────────────────────────
  if (!body.start) return Response.json({ error: "Kein Termin gewählt." }, { status: 400 })

  const start = new Date(body.start)
  if (Number.isNaN(start.getTime())) {
    return Response.json({ error: "Der gewählte Termin ist ungültig." }, { status: 400 })
  }

  if (invite.booking_id) {
    const existing = await loadBooking(invite.booking_id)
    if (existing && existing.status === "confirmed") {
      return Response.json(
        { error: "Für diesen Link ist bereits ein Termin gebucht.", booking: publicBooking(existing) },
        { status: 409 },
      )
    }
  }

  if (meetingType.locationKind === "phone" && !body.phone?.trim()) {
    return Response.json({ error: "Bitte geben Sie eine Telefonnummer an." }, { status: 400 })
  }

  const profile = await loadProfile(db, invite.user_id)
  const end = new Date(start.getTime() + meetingType.durationMinutes * 60 * 1000)

  // Belegtzeiten direkt vor dem Schreiben erneut holen: Zwischen Anzeige und
  // Klick können Minuten liegen, in denen der Slot vergeben wurde.
  const { busy } = await collectBusy(
    db,
    invite.user_id,
    new Date(start.getTime() - 4 * 60 * 60 * 1000),
    new Date(end.getTime() + 4 * 60 * 60 * 1000),
    profile.timezone,
  )

  const check = isSlotStillFree(start, meetingType.durationMinutes, profile, busy)
  if (!check.ok) return Response.json({ error: check.reason }, { status: 409 })

  const result = await createBooking(db, {
    userId: invite.user_id,
    meetingType,
    start,
    end,
    timezone: profile.timezone,
    jobCandidateId: invite.job_candidate_id,
    jobId: invite.job_id,
    candidateId: invite.candidate_id,
    attendeeName: body.name?.trim() || invite.candidate_name,
    attendeeEmail: invite.candidate_email,
    attendeePhone: body.phone?.trim() || null,
    attendeeNote: body.note?.trim() || null,
    jobTitle: invite.job_title,
    companyName: invite.company_name,
  })

  if ("error" in result) return Response.json({ error: result.error }, { status: 500 })

  const booking = result.booking

  await db
    .from("booking_invites")
    .update({ status: "booked", booking_id: booking.id })
    .eq("id", invite.id)

  if (invite.job_candidate_id) {
    await refreshNextInterview(db, invite.job_candidate_id)
    // Statusfortschritt, damit die Kandidatenliste den Termin widerspiegelt.
    await db
      .from("job_candidates")
      .update({ status: "Eingeladen" })
      .eq("id", invite.job_candidate_id)
  }

  const recruiterEmail = await recruiterAddress(invite.user_id)

  after(async () => {
    const ctx = {
      bookingId: booking.id,
      start: new Date(booking.starts_at),
      end: new Date(booking.ends_at),
      timezone: booking.timezone,
      meetingTypeName: meetingType.name,
      locationKind: booking.location_kind,
      locationValue: booking.location_value,
      meetingUrl: booking.meeting_url,
      jobTitle: invite.job_title,
      companyName: invite.company_name,
      candidateName: booking.attendee_name,
      candidateEmail: booking.attendee_email,
      recruiterEmail,
      manageUrl,
    }
    await sendBookingConfirmation(ctx)
    await sendRecruiterBookingNotice(ctx)
  })

  return Response.json({ ok: true, booking: publicBooking(booking) })
}

/** E-Mail des Recruiters aus der Auth-Tabelle. */
async function recruiterAddress(userId: string): Promise<string | null> {
  try {
    const { data } = await adminClient().auth.admin.getUserById(userId)
    return data?.user?.email ?? null
  } catch {
    return null
  }
}
