import type { SupabaseClient } from "@supabase/supabase-js"

import {
  createEvent,
  deleteEvent,
  validAccessToken,
  type CalendarAccountRow,
} from "./providers"
import { adminClient, loadCalendarAccounts } from "./store"
import { formatInZone } from "./timezone"
import type { LocationKind, MeetingType } from "./types"
import { locationLine } from "@/lib/email/scheduling"

// Schreiben und Zurücknehmen eines Termins. Der Kalender des Anbieters ist
// hier bewusst zweitrangig: Erst steht die Buchung in Revetly, danach wird
// versucht, sie in den verbundenen Kalender zu spiegeln. Scheitert das, hat
// der Bewerber trotzdem einen bestätigten Termin, und der Recruiter sieht ihn
// in Revetly. Andersherum wäre eine Buchung von der Erreichbarkeit von Google
// abhängig.

export interface BookingContext {
  userId: string
  meetingType: MeetingType
  start: Date
  end: Date
  timezone: string
  jobCandidateId?: string | null
  jobId?: string | null
  candidateId?: string | null
  attendeeName?: string | null
  attendeeEmail?: string | null
  attendeePhone?: string | null
  attendeeNote?: string | null
  jobTitle?: string | null
  companyName?: string | null
  rescheduledFrom?: string | null
}

export interface BookingRow {
  id: string
  user_id: string
  starts_at: string
  ends_at: string
  timezone: string
  status: string
  meeting_url: string | null
  location_kind: LocationKind
  location_value: string | null
  attendee_name: string | null
  attendee_email: string | null
  external_provider: string | null
  external_calendar_id: string | null
  external_event_id: string | null
  job_candidate_id: string | null
  job_id: string | null
  meeting_type_id: string | null
}

function eventSummary(ctx: BookingContext): string {
  const who = ctx.attendeeName?.trim() || ctx.attendeeEmail?.trim() || "Bewerber"
  return ctx.jobTitle ? `${ctx.meetingType.name}: ${who} (${ctx.jobTitle})` : `${ctx.meetingType.name}: ${who}`
}

function eventDescription(ctx: BookingContext): string {
  const lines = [
    ctx.jobTitle ? `Stelle: ${ctx.jobTitle}` : "",
    ctx.attendeeEmail ? `E-Mail: ${ctx.attendeeEmail}` : "",
    ctx.attendeePhone ? `Telefon: ${ctx.attendeePhone}` : "",
    ctx.attendeeNote?.trim() ? `\nNachricht des Bewerbers:\n${ctx.attendeeNote.trim()}` : "",
    "",
    "Gebucht über Revetly.",
  ]
  return lines.filter((l) => l !== "").join("\n")
}

/**
 * Legt die Buchung an und spiegelt sie best-effort in den externen Kalender.
 * Gibt die gespeicherte Zeile samt eventuellem Videolink zurück.
 */
export async function createBooking(
  db: SupabaseClient,
  ctx: BookingContext,
): Promise<{ booking: BookingRow } | { error: string }> {
  const { data: inserted, error } = await db
    .from("bookings")
    .insert({
      user_id: ctx.userId,
      meeting_type_id: ctx.meetingType.id,
      job_candidate_id: ctx.jobCandidateId ?? null,
      job_id: ctx.jobId ?? null,
      candidate_id: ctx.candidateId ?? null,
      starts_at: ctx.start.toISOString(),
      ends_at: ctx.end.toISOString(),
      timezone: ctx.timezone,
      status: "confirmed",
      attendee_name: ctx.attendeeName ?? null,
      attendee_email: ctx.attendeeEmail ?? null,
      attendee_phone: ctx.attendeePhone ?? null,
      attendee_note: ctx.attendeeNote ?? null,
      location_kind: ctx.meetingType.locationKind,
      location_value: ctx.meetingType.locationValue,
      meeting_url: ctx.meetingType.locationKind === "custom_link" ? ctx.meetingType.locationValue : null,
      rescheduled_from: ctx.rescheduledFrom ?? null,
    })
    .select("*")
    .single()

  if (error || !inserted) {
    console.error("[scheduling] Buchung speichern fehlgeschlagen:", error)
    return { error: "Der Termin konnte nicht gespeichert werden." }
  }

  const booking = inserted as BookingRow

  // Spiegelung in den externen Kalender. Jeder Fehler bleibt hier stehen.
  const accounts = (await loadCalendarAccounts(db, ctx.userId)).filter((a) => a.write_enabled)
  if (accounts.length > 0) {
    const target = accounts[0]
    try {
      const { accessToken, updated } = await validAccessToken(target)
      if (updated) await db.from("calendar_accounts").update(updated).eq("id", target.id)

      const created = await createEvent(target, accessToken, {
        summary: eventSummary(ctx),
        description: eventDescription(ctx),
        start: ctx.start,
        end: ctx.end,
        timeZone: ctx.timezone,
        attendeeEmail: ctx.attendeeEmail,
        attendeeName: ctx.attendeeName,
        locationKind: ctx.meetingType.locationKind,
        locationValue: ctx.meetingType.locationValue,
      })

      const { data: patched } = await db
        .from("bookings")
        .update({
          external_provider: target.provider,
          external_calendar_id: target.calendar_id,
          external_event_id: created.eventId,
          meeting_url: created.meetingUrl ?? booking.meeting_url,
        })
        .eq("id", booking.id)
        .select("*")
        .single()

      if (patched) return { booking: patched as BookingRow }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error("[scheduling] Kalendereintrag fehlgeschlagen:", message)
      await db
        .from("calendar_accounts")
        .update({ last_error: message.slice(0, 500), last_error_at: new Date().toISOString() })
        .eq("id", target.id)
    }
  }

  return { booking }
}

/** Nimmt eine Buchung zurück und räumt den externen Kalendereintrag mit weg. */
export async function cancelBooking(
  db: SupabaseClient,
  booking: BookingRow,
  by: "recruiter" | "candidate",
  reason?: string | null,
): Promise<void> {
  await db
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_by: by,
      cancel_reason: reason?.trim()?.slice(0, 1000) || null,
    })
    .eq("id", booking.id)

  if (booking.job_candidate_id) {
    await db
      .from("job_candidates")
      .update({ next_interview_at: null })
      .eq("id", booking.job_candidate_id)
  }

  if (!booking.external_event_id || !booking.external_provider) return

  const accounts = await loadCalendarAccounts(db, booking.user_id)
  const account = accounts.find(
    (a) => a.provider === booking.external_provider && a.calendar_id === booking.external_calendar_id,
  )
  if (!account) return

  try {
    const { accessToken, updated } = await validAccessToken(account as CalendarAccountRow)
    if (updated) await db.from("calendar_accounts").update(updated).eq("id", account.id)
    await deleteEvent(account as CalendarAccountRow, accessToken, booking.external_event_id)
  } catch (err) {
    console.error("[scheduling] Kalendereintrag löschen fehlgeschlagen:", err)
  }
}

/** Nächsten bestätigten Termin an der Bewerbung vermerken (für Listenansichten). */
export async function refreshNextInterview(db: SupabaseClient, jobCandidateId: string): Promise<void> {
  const { data } = await db
    .from("bookings")
    .select("starts_at")
    .eq("job_candidate_id", jobCandidateId)
    .eq("status", "confirmed")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(1)

  await db
    .from("job_candidates")
    .update({ next_interview_at: data?.[0]?.starts_at ?? null })
    .eq("id", jobCandidateId)
}

/** Kurzbeschreibung eines Termins für Aktivitätsprotokolle. */
export function bookingHeadline(booking: BookingRow, meetingTypeName: string): string {
  return `${meetingTypeName} am ${formatInZone(new Date(booking.starts_at), booking.timezone)} Uhr, ${locationLine(
    booking.location_kind,
    booking.location_value,
    booking.meeting_url,
  )}`
}

export { adminClient }
