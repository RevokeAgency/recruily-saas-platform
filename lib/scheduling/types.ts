import type { WeekdayKey } from "./timezone"

export interface HourBlock {
  /** "09:00" */
  start: string
  /** "17:00" */
  end: string
}

export type WeeklyHours = Partial<Record<WeekdayKey, HourBlock[]>>

export interface SchedulingProfile {
  userId: string
  timezone: string
  weeklyHours: WeeklyHours
  minNoticeMinutes: number
  maxDaysAhead: number
  bufferBeforeMinutes: number
  bufferAfterMinutes: number
  slotIntervalMinutes: number
  maxPerDay: number
}

export type LocationKind = "video_auto" | "custom_link" | "phone" | "onsite"

export interface MeetingType {
  id: string
  userId: string
  name: string
  description: string | null
  durationMinutes: number
  locationKind: LocationKind
  locationValue: string | null
  isDefault: boolean
  active: boolean
}

/** Belegte Zeitspanne, egal ob aus Revetly oder aus einem fremden Kalender. */
export interface BusyInterval {
  start: Date
  end: Date
}

export interface Slot {
  /** Beginn als ISO-Zeitstempel in UTC. */
  start: string
  end: string
}

export interface SlotDay {
  /** "YYYY-MM-DD" in der Zeitzone des Recruiters. */
  date: string
  slots: Slot[]
}

export const DEFAULT_WEEKLY_HOURS: WeeklyHours = {
  mon: [{ start: "09:00", end: "17:00" }],
  tue: [{ start: "09:00", end: "17:00" }],
  wed: [{ start: "09:00", end: "17:00" }],
  thu: [{ start: "09:00", end: "17:00" }],
  fri: [{ start: "09:00", end: "16:00" }],
  sat: [],
  sun: [],
}

export const DEFAULT_PROFILE: Omit<SchedulingProfile, "userId"> = {
  timezone: "Europe/Vienna",
  weeklyHours: DEFAULT_WEEKLY_HOURS,
  minNoticeMinutes: 720,
  maxDaysAhead: 30,
  bufferBeforeMinutes: 0,
  bufferAfterMinutes: 15,
  slotIntervalMinutes: 15,
  maxPerDay: 6,
}

export const LOCATION_LABELS: Record<LocationKind, string> = {
  video_auto: "Videocall",
  custom_link: "Videocall",
  phone: "Telefon",
  onsite: "Vor Ort",
}
