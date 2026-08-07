// Zeitzonen-Rechnung ohne zusätzliche Bibliothek.
//
// Termine werden absolut gespeichert (timestamptz), angezeigt und definiert
// werden sie aber lokal: „Dienstag 9 bis 17 Uhr in Europe/Vienna". Zwischen
// beidem muss sauber umgerechnet werden, sonst verschiebt sich am letzten
// Oktoberwochenende jeder Termin um eine Stunde.
//
// Intl.DateTimeFormat kennt die vollständige Zeitzonendatenbank und liegt in
// jeder Node-Laufzeit vor. Darauf bauen die zwei Grundfunktionen unten auf.

export const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const
export type WeekdayKey = (typeof WEEKDAY_KEYS)[number]

interface ZonedParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  weekday: WeekdayKey
}

const partsCache = new Map<string, Intl.DateTimeFormat>()

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = partsCache.get(timeZone)
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
    })
    partsCache.set(timeZone, f)
  }
  return f
}

const WEEKDAY_FROM_SHORT: Record<string, WeekdayKey> = {
  Sun: "sun", Mon: "mon", Tue: "tue", Wed: "wed", Thu: "thu", Fri: "fri", Sat: "sat",
}

/** Wanduhrzeit eines absoluten Zeitpunkts in der angegebenen Zeitzone. */
export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const map: Record<string, string> = {}
  for (const p of formatter(timeZone).formatToParts(date)) map[p.type] = p.value
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour) % 24,
    minute: Number(map.minute),
    second: Number(map.second),
    weekday: WEEKDAY_FROM_SHORT[map.weekday] ?? "mon",
  }
}

/** Abstand der Zeitzone zu UTC in Millisekunden, gültig für diesen Zeitpunkt. */
function offsetMs(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  // Millisekunden mitnehmen, sonst springt das Ergebnis um bis zu 999 ms.
  return asUtc - (date.getTime() - date.getMilliseconds())
}

/**
 * Wanduhrzeit → absoluter Zeitpunkt.
 *
 * Der Abstand zu UTC hängt selbst vom Zeitpunkt ab (Sommerzeit), deshalb zwei
 * Durchläufe: Der erste schätzt mit einem groben Zeitpunkt, der zweite rechnet
 * mit dem bereits korrigierten. Nach dem zweiten Durchlauf ist das Ergebnis
 * auch an Umstellungstagen stabil.
 *
 * Nicht existierende Zeiten (die übersprungene Stunde im Frühjahr) landen auf
 * dem Zeitpunkt direkt nach dem Sprung. Doppelte Zeiten im Herbst lösen sich
 * auf die erste Belegung auf. Beides ist für Terminbuchung die harmlose Wahl,
 * weil solche Zeiten in Arbeitszeitfenstern praktisch nie vorkommen.
 */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const naive = Date.UTC(year, month - 1, day, hour, minute, 0, 0)
  let ts = naive
  for (let i = 0; i < 2; i++) {
    ts = naive - offsetMs(new Date(ts), timeZone)
  }
  return new Date(ts)
}

/** "2026-08-12" + "09:30" in der Zeitzone → absoluter Zeitpunkt. */
export function isoDateTimeToUtc(isoDate: string, hhmm: string, timeZone: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number)
  const [hh, mm] = hhmm.split(":").map(Number)
  return zonedTimeToUtc(y, m, d, hh, mm, timeZone)
}

/** Datum eines absoluten Zeitpunkts als "YYYY-MM-DD" in der Zeitzone. */
export function zonedDateKey(date: Date, timeZone: string): string {
  const p = zonedParts(date, timeZone)
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`
}

/** Wochentagsschlüssel eines absoluten Zeitpunkts in der Zeitzone. */
export function zonedWeekday(date: Date, timeZone: string): WeekdayKey {
  return zonedParts(date, timeZone).weekday
}

/** Kalendertage ab einem Startdatum, als "YYYY-MM-DD" in der Zeitzone. */
export function dateKeysFrom(start: Date, days: number, timeZone: string): string[] {
  const keys: string[] = []
  const p = zonedParts(start, timeZone)
  for (let i = 0; i < days; i++) {
    // Über UTC-Mittag rechnen: dieser Zeitpunkt fällt in jeder Zeitzone auf
    // denselben Kalendertag, auch bei Umstellungen.
    const d = new Date(Date.UTC(p.year, p.month - 1, p.day + i, 12, 0, 0))
    keys.push(zonedDateKey(d, timeZone))
  }
  return keys
}

/** Minuten seit Mitternacht, z. B. "09:30" → 570. */
export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + (m || 0)
}

export function minutesToHhmm(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

/** Anzeigeformat für E-Mails und Bestätigungen, z. B. "Di, 12. Aug 2026, 09:30". */
export function formatInZone(date: Date, timeZone: string, locale = "de-DE"): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

/** Kurzform der Zeitzone für die Anzeige, z. B. "MESZ". */
export function zoneAbbreviation(date: Date, timeZone: string, locale = "de-DE"): string {
  const parts = new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: "short" }).formatToParts(date)
  return parts.find((p) => p.type === "timeZoneName")?.value ?? timeZone
}
