import { NextRequest } from "next/server"

import { createClient as createServer } from "@/lib/supabase/server"
import { encryptionAvailable } from "@/lib/scheduling/crypto"
import { providerConfigured } from "@/lib/scheduling/providers"
import { adminClient, ensureDefaultMeetingType, loadMeetingTypes, loadProfile } from "@/lib/scheduling/store"
import { WEEKDAY_KEYS } from "@/lib/scheduling/timezone"
import type { HourBlock, WeeklyHours } from "@/lib/scheduling/types"

export const dynamic = "force-dynamic"

async function requireUser() {
  const supabase = await createServer()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/** Gesamter Zustand der Terminplanung für die Einstellungsseite. */
export async function GET() {
  const user = await requireUser()
  if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

  const db = adminClient()

  try {
    const [profile, accounts] = await Promise.all([
      loadProfile(db, user.id),
      db.from("calendar_accounts")
        .select("id, provider, account_email, busy_enabled, write_enabled, last_error, last_error_at, created_at")
        .eq("user_id", user.id),
    ])

    // Erste Terminart anlegen, damit sofort eingeladen werden kann.
    await ensureDefaultMeetingType(db, user.id)
    const meetingTypes = await loadMeetingTypes(db, user.id)

    return Response.json({
      profile,
      meetingTypes,
      accounts: accounts.data ?? [],
      setup: {
        encryptionReady: encryptionAvailable(),
        google: providerConfigured("google"),
        microsoft: providerConfigured("microsoft"),
      },
    })
  } catch (err) {
    // Fehlt Migration 025, liefert der SELECT einen Fehler. Die Seite zeigt
    // dann einen Hinweis statt einer leeren Oberfläche.
    console.error("[scheduling] Einstellungen nicht ladbar:", err)
    return Response.json({ error: "migration_fehlt" }, { status: 503 })
  }
}

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/

function sanitizeHours(input: unknown): WeeklyHours | null {
  if (!input || typeof input !== "object") return null
  const out: WeeklyHours = {}

  for (const day of WEEKDAY_KEYS) {
    const raw = (input as Record<string, unknown>)[day]
    if (!Array.isArray(raw)) {
      out[day] = []
      continue
    }
    const blocks: HourBlock[] = []
    for (const entry of raw.slice(0, 4)) {
      if (!entry || typeof entry !== "object") continue
      const start = String((entry as HourBlock).start ?? "")
      const end = String((entry as HourBlock).end ?? "")
      if (!TIME.test(start) || !TIME.test(end)) continue
      if (start >= end) continue
      blocks.push({ start, end })
    }
    out[day] = blocks.sort((a, b) => a.start.localeCompare(b.start))
  }
  return out
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

export async function PUT(req: NextRequest) {
  const user = await requireUser()
  if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const current = await loadProfile(adminClient(), user.id)

  const timezone = typeof body.timezone === "string" ? body.timezone : current.timezone
  // Eine unbekannte Zeitzone würde jede Slot-Berechnung werfen, deshalb vorher
  // prüfen und im Zweifel die alte behalten.
  try {
    new Intl.DateTimeFormat("de-DE", { timeZone: timezone })
  } catch {
    return Response.json({ error: "Unbekannte Zeitzone." }, { status: 400 })
  }

  const weeklyHours = sanitizeHours(body.weeklyHours) ?? current.weeklyHours

  const update = {
    user_id: user.id,
    timezone,
    weekly_hours: weeklyHours,
    min_notice_minutes: clamp(body.minNoticeMinutes, 0, 20160, current.minNoticeMinutes),
    max_days_ahead: clamp(body.maxDaysAhead, 1, 180, current.maxDaysAhead),
    buffer_before_minutes: clamp(body.bufferBeforeMinutes, 0, 120, current.bufferBeforeMinutes),
    buffer_after_minutes: clamp(body.bufferAfterMinutes, 0, 120, current.bufferAfterMinutes),
    slot_interval_minutes: clamp(body.slotIntervalMinutes, 5, 120, current.slotIntervalMinutes),
    max_per_day: clamp(body.maxPerDay, 0, 50, current.maxPerDay),
  }

  const { error } = await adminClient()
    .from("scheduling_profiles")
    .upsert(update, { onConflict: "user_id" })

  if (error) {
    console.error("[scheduling] Profil speichern fehlgeschlagen:", error)
    return Response.json({ error: "Konnte die Einstellungen nicht speichern." }, { status: 500 })
  }

  return Response.json({ profile: await loadProfile(adminClient(), user.id) })
}
