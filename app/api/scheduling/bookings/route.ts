import { after, type NextRequest } from "next/server"

import { createClient as createServer } from "@/lib/supabase/server"
import { cancelBooking, refreshNextInterview, type BookingRow } from "@/lib/scheduling/booking"
import { sendBookingCancellation } from "@/lib/email/scheduling"
import { adminClient, loadMeetingTypes, loadProfile } from "@/lib/scheduling/store"

export const dynamic = "force-dynamic"

async function requireUser() {
  const supabase = await createServer()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Termine des Recruiters. `scope=upcoming` (Standard) liefert alles ab jetzt,
 * `scope=past` die letzten erledigten.
 */
export async function GET(req: NextRequest) {
  const user = await requireUser()
  if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

  const scope = new URL(req.url).searchParams.get("scope") ?? "upcoming"
  const db = adminClient()
  const now = new Date().toISOString()

  let query = db
    .from("bookings")
    .select(
      "id, starts_at, ends_at, timezone, status, attendee_name, attendee_email, attendee_phone, attendee_note, location_kind, location_value, meeting_url, job_id, job_candidate_id, meeting_type_id, external_provider, cancelled_by, cancel_reason",
    )
    .eq("user_id", user.id)

  if (scope === "past") {
    query = query.lt("starts_at", now).order("starts_at", { ascending: false }).limit(50)
  } else {
    query = query.gte("starts_at", now).neq("status", "cancelled").order("starts_at", { ascending: true }).limit(100)
  }

  const { data, error } = await query
  if (error) {
    console.error("[scheduling] Termine nicht ladbar:", error)
    return Response.json({ error: "migration_fehlt" }, { status: 503 })
  }

  const bookings = data ?? []

  // Stellentitel und Terminart in einem Rutsch nachladen, damit die Liste
  // ohne weiteren Rundlauf vollständig ist.
  const jobIds = [...new Set(bookings.map((b) => b.job_id).filter(Boolean))] as string[]
  const jobs = jobIds.length
    ? (await db.from("jobs").select("id, title, company").in("id", jobIds)).data ?? []
    : []
  const types = await loadMeetingTypes(db, user.id)
  const profile = await loadProfile(db, user.id)

  return Response.json({
    timezone: profile.timezone,
    bookings: bookings.map((b) => ({
      ...b,
      job: jobs.find((j) => j.id === b.job_id) ?? null,
      meetingTypeName: types.find((t) => t.id === b.meeting_type_id)?.name ?? "Gespräch",
    })),
  })
}

/** Termin absagen. Der Bewerber bekommt eine Mail samt Absage fürs Kalenderprogramm. */
export async function DELETE(req: NextRequest) {
  const user = await requireUser()
  if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  const reason = url.searchParams.get("reason")
  if (!id) return Response.json({ error: "Kein Termin angegeben." }, { status: 400 })

  const db = adminClient()
  const { data } = await db
    .from("bookings")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle()

  const booking = data as BookingRow | null
  if (!booking) return Response.json({ error: "Termin nicht gefunden." }, { status: 404 })
  if (booking.status === "cancelled") return Response.json({ ok: true })

  await cancelBooking(db, booking, "recruiter", reason)
  if (booking.job_candidate_id) await refreshNextInterview(db, booking.job_candidate_id)

  // Der Buchungslink des Bewerbers wird wieder frei, damit er selbst umbuchen
  // kann, ohne dass der Recruiter neu einladen muss.
  await db
    .from("booking_invites")
    .update({ status: "open", booking_id: null })
    .eq("booking_id", booking.id)

  const types = await loadMeetingTypes(db, user.id)
  const profile = await loadProfile(db, user.id)

  if (booking.attendee_email) {
    const { data: job } = booking.job_id
      ? await db.from("jobs").select("title, company").eq("id", booking.job_id).maybeSingle()
      : { data: null }

    after(async () => {
      await sendBookingCancellation(
        {
          bookingId: booking.id,
          start: new Date(booking.starts_at),
          end: new Date(booking.ends_at),
          timezone: booking.timezone || profile.timezone,
          meetingTypeName: types.find((t) => t.id === booking.meeting_type_id)?.name ?? "Gespräch",
          locationKind: booking.location_kind,
          locationValue: booking.location_value,
          meetingUrl: booking.meeting_url,
          jobTitle: job?.title ?? null,
          companyName: job?.company ?? null,
          candidateName: booking.attendee_name,
          candidateEmail: booking.attendee_email,
          recruiterEmail: user.email ?? null,
        },
        { to: booking.attendee_email!, byRecruiter: true, reason },
      )
    })
  }

  return Response.json({ ok: true })
}
