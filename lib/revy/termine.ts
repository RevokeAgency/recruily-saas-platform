import type { SupabaseClient } from "@supabase/supabase-js"
import { computeSlots } from "@/lib/scheduling/availability"
import { createBookingToken } from "@/lib/scheduling/crypto"
import { collectBusy, ensureDefaultMeetingType, loadCalendarAccounts, loadMeetingTypes, loadProfile } from "@/lib/scheduling/store"
import { formatInZone, type WeekdayKey } from "@/lib/scheduling/timezone"
import { BOOKING_INVITE_VALID_DAYS, type LocationKind, type MeetingType, type WeeklyHours } from "@/lib/scheduling/types"
import { absoluteUrl } from "@/lib/site"
import { fold } from "./tools/base"
import type { TerminartText } from "./vorlagen"

// ─────────────────────────────────────────────────────────────────────────────
// Terminvorschläge (Etappe 4). Revy nutzt die bestehende Terminbuchung
// (Migration 025) und baut keine zweite Konfiguration: Zeiten, Terminarten und
// Kalender stellt die Person unter Termine ein.
//
// Gelesen werden nur die eigenen Termindaten der angemeldeten Person
// (actorId): Wochenzeiten, Terminarten, belegte Zeiten. Keine Bewerberdaten.
// Dafür die Service-Rolle, genau wie die Buchungsseite, weil die belegten
// Zeiten aus verbundenen Kalendern über gespeicherte Zugänge kommen.
//
// Der Buchungslink entsteht erst beim Versand (createInviteForDelivery). Der
// Klartext-Token steht nur in der Mail; gespeichert wird sein Hash.
// ─────────────────────────────────────────────────────────────────────────────

export const ORT_TEXT: Record<LocationKind, string> = {
  video_auto: "per Video",
  custom_link: "per Video",
  phone: "per Telefon",
  onsite: "vor Ort",
}

/** Terminart, wenn noch keine angelegt ist: wie ensureDefaultMeetingType. */
export const STANDARD_TERMINART: TerminartText = { name: "Erstgespräch", dauer: 30, ort: ORT_TEXT.video_auto }

export interface Terminart {
  id: string
  name: string
  dauer: number
  ort: string
  standard: boolean
}

export interface TerminStand {
  /** Hat die Person ihre Zeiten unter Termine schon gespeichert? */
  eingerichtet: boolean
  zeitzone: string
  wochenzeiten: string[]
  terminarten: Terminart[]
  /** Verbundene Kalender, deren belegte Zeiten zählen. */
  kalender: number
}

const TAGE: Array<[WeekdayKey, string]> = [
  ["mon", "Mo"],
  ["tue", "Di"],
  ["wed", "Mi"],
  ["thu", "Do"],
  ["fri", "Fr"],
  ["sat", "Sa"],
  ["sun", "So"],
]

/** Wochenzeiten in Worten, gleiche Tage zusammengefasst: „Mo bis Fr 09:00 bis 17:00“. */
export function describeWeeklyHours(h: WeeklyHours): string[] {
  const zeilen: Array<{ von: string; bis: string; zeiten: string }> = []
  let vorher: string | null = null
  for (const [key, label] of TAGE) {
    const bloecke = h[key] ?? []
    const zeiten = bloecke.map((b) => `${b.start} bis ${b.end}`).join(" und ")
    if (!zeiten) {
      vorher = null
      continue
    }
    const letzte = zeilen[zeilen.length - 1]
    if (letzte && vorher === zeiten) letzte.bis = label
    else zeilen.push({ von: label, bis: label, zeiten })
    vorher = zeiten
  }
  return zeilen.map((z) => `${z.von === z.bis ? z.von : `${z.von} bis ${z.bis}`} ${z.zeiten}`)
}

function toTerminart(t: MeetingType): Terminart {
  return { id: t.id, name: t.name, dauer: t.durationMinutes, ort: ORT_TEXT[t.locationKind] ?? "", standard: t.isDefault }
}

export async function terminStand(admin: SupabaseClient, actorId: string): Promise<TerminStand> {
  const [{ data: row }, profile, types, accounts] = await Promise.all([
    admin.from("scheduling_profiles").select("user_id").eq("user_id", actorId).maybeSingle(),
    loadProfile(admin, actorId),
    loadMeetingTypes(admin, actorId),
    loadCalendarAccounts(admin, actorId),
  ])
  return {
    eingerichtet: !!row,
    zeitzone: profile.timezone,
    wochenzeiten: describeWeeklyHours(profile.weeklyHours),
    terminarten: types.filter((t) => t.active).map(toTerminart),
    kalender: accounts.filter((a) => a.busy_enabled).length,
  }
}

/**
 * Terminart nach Wunsch aus dem Befehl, sonst die Standard-Terminart. null,
 * wenn noch keine angelegt ist; dann legt der Versand die Standard-Terminart an.
 */
export function pickTerminart(stand: TerminStand, wunsch?: string | null): { art: Terminart | null; nichtGefunden: boolean } {
  const w = wunsch ? fold(wunsch) : ""
  const passend = w ? stand.terminarten.find((t) => fold(t.name).includes(w) || w.includes(fold(t.name))) : undefined
  const art = passend ?? stand.terminarten.find((t) => t.standard) ?? stand.terminarten[0] ?? null
  return { art, nichtGefunden: !!w && !passend }
}

export interface FreieZeiten {
  /** Die nächsten freien Beginnzeiten, lesbar in der Zeitzone der Person. */
  naechste: string[]
  gesamt: number
  tage: number
  /** Ein verbundener Kalender war nicht erreichbar. */
  unvollstaendig: boolean
}

/** Kurz: „Mo., 30.11., 09:00 Uhr“. */
function kurz(d: Date, timeZone: string): string {
  return `${new Intl.DateTimeFormat("de-DE", { timeZone, weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d)} Uhr`
}

/** Freie Zeiten wie auf der Buchungsseite: Wochenzeiten minus belegte Zeiten. */
export async function freieZeiten(admin: SupabaseClient, actorId: string, dauer: number, opts: { tage?: number; anzahl?: number; now?: Date } = {}): Promise<FreieZeiten> {
  const profile = await loadProfile(admin, actorId)
  const now = opts.now ?? new Date()
  const tage = Math.max(1, Math.min(opts.tage ?? 14, profile.maxDaysAhead || 14))
  const to = new Date(now.getTime() + tage * 86_400_000)
  const { busy, degraded } = await collectBusy(admin, actorId, now, to, profile.timezone)
  const slots = computeSlots({ profile, durationMinutes: dauer, busy, from: now, to, now }).flatMap((d) => d.slots)
  return {
    naechste: slots.slice(0, opts.anzahl ?? 5).map((s) => kurz(new Date(s.start), profile.timezone)),
    gesamt: slots.length,
    tage,
    unvollstaendig: degraded,
  }
}

/** Terminart als Text für den Entwurf. */
export function terminartText(art: Terminart | null): TerminartText {
  return art ? { name: art.name, dauer: art.dauer, ort: art.ort } : STANDARD_TERMINART
}

// ── Versand ─────────────────────────────────────────────────────────────────

export interface InviteInput {
  /** Person, deren Kalender der Link nutzt: die, die freigegeben hat. */
  userId: string
  meetingTypeId: string | null
  jobCandidateId: string
  jobId: string | null
  candidateId: string | null
  candidateName: string | null
  candidateEmail: string
  jobTitle: string | null
  companyName: string | null
  note: string | null
}

/**
 * Legt den Buchungslink an, wie /api/scheduling/invites. Ältere offene Links
 * zur selben Bewerbung zieht erst activateInvite zurück, nach dem Versand,
 * damit ein fehlgeschlagener Versand keinen gültigen Link entwertet.
 */
export async function createInviteForDelivery(
  admin: SupabaseClient,
  input: InviteInput,
): Promise<{ inviteId: string; url: string; gueltigBis: string } | { fehler: string }> {
  const types = await loadMeetingTypes(admin, input.userId)
  const chosen =
    types.find((t) => t.id === input.meetingTypeId && t.active) ??
    types.find((t) => t.isDefault && t.active) ??
    types.find((t) => t.active) ??
    (await ensureDefaultMeetingType(admin, input.userId))
  if (!chosen) return { fehler: "Keine Terminart eingerichtet" }

  const profile = await loadProfile(admin, input.userId)
  const { token, hash } = createBookingToken()
  const expiresAt = new Date(Date.now() + BOOKING_INVITE_VALID_DAYS * 86_400_000)
  const { data, error } = await admin
    .from("booking_invites")
    .insert({
      user_id: input.userId,
      meeting_type_id: chosen.id,
      job_candidate_id: input.jobCandidateId,
      job_id: input.jobId,
      candidate_id: input.candidateId,
      token_hash: hash,
      expires_at: expiresAt.toISOString(),
      candidate_name: input.candidateName,
      candidate_email: input.candidateEmail,
      job_title: input.jobTitle,
      company_name: input.companyName,
      personal_note: input.note,
    })
    .select("id")
    .single()
  if (error || !data) return { fehler: "Buchungslink nicht angelegt" }
  return { inviteId: data.id as string, url: absoluteUrl(`/termin/${token}`), gueltigBis: `${formatInZone(expiresAt, profile.timezone)} Uhr` }
}

/** Nach dem Versand: ältere offene Links zur Bewerbung zurückziehen. */
export async function activateInvite(admin: SupabaseClient, inviteId: string, jobCandidateId: string): Promise<void> {
  await admin.from("booking_invites").update({ status: "revoked" }).eq("job_candidate_id", jobCandidateId).eq("status", "open").neq("id", inviteId)
}

/** Versand gescheitert: den neuen Link zurückziehen. */
export async function revokeInvite(admin: SupabaseClient, inviteId: string): Promise<void> {
  await admin.from("booking_invites").update({ status: "revoked" }).eq("id", inviteId)
}
