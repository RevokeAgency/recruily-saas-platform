import { createClient as createAdmin, type SupabaseClient } from "@supabase/supabase-js"

import {
  fetchBusy,
  validAccessToken,
  type CalendarAccountRow,
} from "./providers"
import { DEFAULT_PROFILE, type BusyInterval, type MeetingType, type SchedulingProfile } from "./types"

// Datenbankzugriffe rund um die Terminplanung. Alles über den Service-Role-Key,
// weil die Buchungsseite ohne Anmeldung erreichbar ist und trotzdem
// Verfügbarkeiten des Recruiters lesen können muss. Die Absicherung passiert
// deshalb im Aufrufer: Der Buchungslink ist der Nachweis.

export function adminClient(): SupabaseClient {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export async function loadProfile(db: SupabaseClient, userId: string): Promise<SchedulingProfile> {
  const { data } = await db
    .from("scheduling_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (!data) return { userId, ...DEFAULT_PROFILE }

  return {
    userId,
    timezone: data.timezone || DEFAULT_PROFILE.timezone,
    weeklyHours: data.weekly_hours || DEFAULT_PROFILE.weeklyHours,
    minNoticeMinutes: data.min_notice_minutes ?? DEFAULT_PROFILE.minNoticeMinutes,
    maxDaysAhead: data.max_days_ahead ?? DEFAULT_PROFILE.maxDaysAhead,
    bufferBeforeMinutes: data.buffer_before_minutes ?? DEFAULT_PROFILE.bufferBeforeMinutes,
    bufferAfterMinutes: data.buffer_after_minutes ?? DEFAULT_PROFILE.bufferAfterMinutes,
    slotIntervalMinutes: data.slot_interval_minutes ?? DEFAULT_PROFILE.slotIntervalMinutes,
    maxPerDay: data.max_per_day ?? DEFAULT_PROFILE.maxPerDay,
  }
}

export function mapMeetingType(row: Record<string, unknown>): MeetingType {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    description: (row.description as string | null) ?? null,
    durationMinutes: Number(row.duration_minutes ?? 30),
    locationKind: (row.location_kind as MeetingType["locationKind"]) ?? "video_auto",
    locationValue: (row.location_value as string | null) ?? null,
    isDefault: row.is_default === true,
    active: row.active !== false,
  }
}

export async function loadMeetingTypes(db: SupabaseClient, userId: string): Promise<MeetingType[]> {
  const { data } = await db
    .from("meeting_types")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
  return (data ?? []).map(mapMeetingType)
}

/**
 * Legt beim ersten Aufruf eine Standard-Terminart an. Ohne die hätte ein neuer
 * Kunde nichts, was er verschicken kann, und müsste erst durch die
 * Einstellungen.
 */
export async function ensureDefaultMeetingType(
  db: SupabaseClient,
  userId: string,
): Promise<MeetingType | null> {
  const existing = await loadMeetingTypes(db, userId)
  const active = existing.filter((t) => t.active)
  if (active.length > 0) return active.find((t) => t.isDefault) ?? active[0]

  const { data, error } = await db
    .from("meeting_types")
    .insert({
      user_id: userId,
      name: "Erstgespräch",
      description: "Kurzes Kennenlernen per Video.",
      duration_minutes: 30,
      location_kind: "video_auto",
      is_default: true,
    })
    .select("*")
    .single()

  if (error || !data) return null
  return mapMeetingType(data)
}

/** Bereits in Revetly vergebene Termine im Zeitraum. */
export async function loadInternalBusy(
  db: SupabaseClient,
  userId: string,
  from: Date,
  to: Date,
  excludeBookingId?: string,
): Promise<BusyInterval[]> {
  let query = db
    .from("bookings")
    .select("id, starts_at, ends_at")
    .eq("user_id", userId)
    .eq("status", "confirmed")
    .lt("starts_at", to.toISOString())
    .gt("ends_at", from.toISOString())

  if (excludeBookingId) query = query.neq("id", excludeBookingId)

  const { data } = await query
  return (data ?? []).map((b) => ({ start: new Date(b.starts_at), end: new Date(b.ends_at) }))
}

export async function loadCalendarAccounts(
  db: SupabaseClient,
  userId: string,
): Promise<CalendarAccountRow[]> {
  const { data } = await db.from("calendar_accounts").select("*").eq("user_id", userId)
  return (data ?? []) as CalendarAccountRow[]
}

/**
 * Belegtzeiten aus allen Quellen: eigene Buchungen plus die verbundenen
 * Kalender.
 *
 * Fällt ein Anbieter aus, wird der Fehler am Konto vermerkt und der Zeitraum
 * ohne diese Quelle berechnet. Die Alternative wäre, gar keine Slots zu
 * zeigen. Ein Termin, der versehentlich doppelt liegt, lässt sich verschieben;
 * eine Buchungsseite, die dauerhaft leer bleibt, kostet Bewerber.
 */
export async function collectBusy(
  db: SupabaseClient,
  userId: string,
  from: Date,
  to: Date,
  timezone: string,
  opts: { excludeBookingId?: string } = {},
): Promise<{ busy: BusyInterval[]; degraded: boolean }> {
  const internal = await loadInternalBusy(db, userId, from, to, opts.excludeBookingId)
  const accounts = (await loadCalendarAccounts(db, userId)).filter((a) => a.busy_enabled)

  if (accounts.length === 0) return { busy: internal, degraded: false }

  const results = await Promise.allSettled(
    accounts.map(async (account) => {
      const { accessToken, updated } = await validAccessToken(account)
      if (updated) {
        await db.from("calendar_accounts").update(updated).eq("id", account.id)
      }
      const busy = await fetchBusy(account, accessToken, from, to, timezone)
      if (account.last_error) {
        await db
          .from("calendar_accounts")
          .update({ last_error: null, last_error_at: null })
          .eq("id", account.id)
      }
      return busy
    }),
  )

  const busy = [...internal]
  let degraded = false

  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    if (result.status === "fulfilled") {
      busy.push(...result.value)
    } else {
      degraded = true
      const message = result.reason instanceof Error ? result.reason.message : String(result.reason)
      console.error(`[scheduling] Belegtzeiten von ${accounts[i].provider} nicht abrufbar:`, message)
      await db
        .from("calendar_accounts")
        .update({ last_error: message.slice(0, 500), last_error_at: new Date().toISOString() })
        .eq("id", accounts[i].id)
    }
  }

  return { busy, degraded }
}
