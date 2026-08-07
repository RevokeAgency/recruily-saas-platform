import {
  dateKeysFrom,
  hhmmToMinutes,
  isoDateTimeToUtc,
  zonedDateKey,
  zonedWeekday,
  type WeekdayKey,
} from "./timezone"
import type { BusyInterval, SchedulingProfile, Slot, SlotDay } from "./types"

// Slot-Berechnung. Bewusst eine reine Funktion ohne Datenbank- oder
// Netzzugriff: Alles, was sie braucht, kommt als Argument herein. Dadurch
// lässt sich das Verhalten an Sommerzeitwechseln, Pufferzeiten und
// Tagesgrenzen prüfen, ohne eine Umgebung aufzubauen.

export interface SlotQuery {
  profile: SchedulingProfile
  /** Dauer des Termins in Minuten. */
  durationMinutes: number
  /** Belegte Zeiten aus Revetly und den verbundenen Kalendern. */
  busy: BusyInterval[]
  /** Ab wann gesucht wird. Standard: jetzt. */
  from?: Date
  /** Bis wann gesucht wird. Standard: from + maxDaysAhead. */
  to?: Date
  /** Referenzzeitpunkt für die Vorlaufzeit. Standard: jetzt. */
  now?: Date
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd
}

/** Belegtzeiten zusammenfassen, damit die Prüfung pro Slot kurz bleibt. */
export function mergeBusy(intervals: BusyInterval[]): BusyInterval[] {
  const sorted = intervals
    .filter((i) => i.end.getTime() > i.start.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime())

  const merged: BusyInterval[] = []
  for (const current of sorted) {
    const last = merged[merged.length - 1]
    if (last && current.start.getTime() <= last.end.getTime()) {
      if (current.end.getTime() > last.end.getTime()) last.end = current.end
    } else {
      merged.push({ start: new Date(current.start), end: new Date(current.end) })
    }
  }
  return merged
}

/**
 * Freie Termine, tageweise gruppiert.
 *
 * Ablauf je Tag: Arbeitszeitfenster des Wochentags nehmen, im eingestellten
 * Raster Startzeiten erzeugen, jeden Kandidatenslot samt Pufferzeiten gegen
 * die Belegtzeiten prüfen, dann Vorlaufzeit und Tagesobergrenze anwenden.
 *
 * Die Umrechnung Wanduhrzeit → absoluter Zeitpunkt passiert pro Tag neu.
 * Deshalb bleibt „ab 9 Uhr" auch nach einer Zeitumstellung 9 Uhr und wandert
 * nicht auf 8 oder 10.
 */
export function computeSlots(query: SlotQuery): SlotDay[] {
  const { profile, durationMinutes } = query
  const now = query.now ?? new Date()
  const from = query.from ?? now
  const tz = profile.timezone

  const horizonEnd =
    query.to ??
    new Date(from.getTime() + profile.maxDaysAhead * 24 * 60 * 60 * 1000)

  // Nicht weiter in die Zukunft anzeigen, als das Profil erlaubt.
  const hardEnd = new Date(
    Math.min(
      horizonEnd.getTime(),
      now.getTime() + profile.maxDaysAhead * 24 * 60 * 60 * 1000,
    ),
  )
  if (hardEnd.getTime() <= from.getTime()) return []

  const earliest = new Date(now.getTime() + profile.minNoticeMinutes * 60 * 1000)
  const busy = mergeBusy(query.busy)

  const dayCount =
    Math.ceil((hardEnd.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1
  const days = dateKeysFrom(from, Math.min(dayCount, profile.maxDaysAhead + 1), tz)

  const bookedPerDay = new Map<string, number>()
  for (const interval of query.busy) {
    const key = zonedDateKey(interval.start, tz)
    bookedPerDay.set(key, (bookedPerDay.get(key) ?? 0) + 1)
  }

  const result: SlotDay[] = []

  for (const dateKey of days) {
    // Wochentag über die Tagesmitte bestimmen, damit die Zuordnung nicht an
    // einer Umstellung um Mitternacht kippt.
    const noon = isoDateTimeToUtc(dateKey, "12:00", tz)
    const weekday: WeekdayKey = zonedWeekday(noon, tz)
    const blocks = profile.weeklyHours[weekday] ?? []
    if (blocks.length === 0) continue

    const alreadyBooked = bookedPerDay.get(dateKey) ?? 0
    if (profile.maxPerDay > 0 && alreadyBooked >= profile.maxPerDay) continue

    const slots: Slot[] = []
    let remainingToday = profile.maxPerDay > 0 ? profile.maxPerDay - alreadyBooked : Infinity

    for (const block of blocks) {
      const blockStart = hhmmToMinutes(block.start)
      const blockEnd = hhmmToMinutes(block.end)
      if (blockEnd <= blockStart) continue

      for (
        let minute = blockStart;
        minute + durationMinutes <= blockEnd;
        minute += profile.slotIntervalMinutes
      ) {
        if (remainingToday <= 0) break

        const hh = String(Math.floor(minute / 60)).padStart(2, "0")
        const mm = String(minute % 60).padStart(2, "0")
        const start = isoDateTimeToUtc(dateKey, `${hh}:${mm}`, tz)
        const end = new Date(start.getTime() + durationMinutes * 60 * 1000)

        if (start.getTime() < earliest.getTime()) continue
        if (start.getTime() < from.getTime()) continue
        if (end.getTime() > hardEnd.getTime()) continue

        // Puffer gehören dem Recruiter, nicht dem Termin: Sie schützen den
        // Slot gegen Nachbartermine, verlängern aber nicht das Gespräch.
        const guardStart = start.getTime() - profile.bufferBeforeMinutes * 60 * 1000
        const guardEnd = end.getTime() + profile.bufferAfterMinutes * 60 * 1000

        const blocked = busy.some((b) =>
          overlaps(guardStart, guardEnd, b.start.getTime(), b.end.getTime()),
        )
        if (blocked) continue

        slots.push({ start: start.toISOString(), end: end.toISOString() })
        remainingToday--
      }
    }

    if (slots.length > 0) result.push({ date: dateKey, slots })
  }

  return result
}

/**
 * Prüft kurz vor dem Schreiben, ob der gewählte Slot noch frei ist.
 * Zwischen Anzeige und Klick können Minuten liegen, in denen jemand anders
 * gebucht hat oder ein Termin im Google-Kalender entstanden ist.
 */
export function isSlotStillFree(
  start: Date,
  durationMinutes: number,
  profile: SchedulingProfile,
  busy: BusyInterval[],
  now: Date = new Date(),
): { ok: true } | { ok: false; reason: string } {
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000)

  if (start.getTime() < now.getTime() + profile.minNoticeMinutes * 60 * 1000) {
    return { ok: false, reason: "Dieser Termin liegt zu kurzfristig." }
  }
  if (start.getTime() > now.getTime() + profile.maxDaysAhead * 24 * 60 * 60 * 1000) {
    return { ok: false, reason: "Dieser Termin liegt zu weit in der Zukunft." }
  }

  const tz = profile.timezone
  const dateKey = zonedDateKey(start, tz)
  const weekday = zonedWeekday(isoDateTimeToUtc(dateKey, "12:00", tz), tz)
  const blocks = profile.weeklyHours[weekday] ?? []

  const startMinutes = (() => {
    const [, , ] = dateKey.split("-")
    const local = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).format(start)
    const [h, m] = local.split(":").map(Number)
    return h * 60 + m
  })()

  const insideHours = blocks.some(
    (b) =>
      startMinutes >= hhmmToMinutes(b.start) &&
      startMinutes + durationMinutes <= hhmmToMinutes(b.end),
  )
  if (!insideHours) {
    return { ok: false, reason: "Dieser Termin liegt außerhalb der Sprechzeiten." }
  }

  const guardStart = start.getTime() - profile.bufferBeforeMinutes * 60 * 1000
  const guardEnd = end.getTime() + profile.bufferAfterMinutes * 60 * 1000
  const collision = mergeBusy(busy).some((b) =>
    overlaps(guardStart, guardEnd, b.start.getTime(), b.end.getTime()),
  )
  if (collision) {
    return { ok: false, reason: "Dieser Termin wurde gerade vergeben." }
  }

  return { ok: true }
}
