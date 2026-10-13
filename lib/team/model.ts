// ─────────────────────────────────────────────────────────────────────────────
// Team: reine Regeln ohne Datenbank, damit sie testbar sind.
//
// Plätze zählen den Inhaber mit. Belegt sind: Inhaber, alle Mitglieder (auch
// gesperrte, sie rücken nach, sobald Platz frei wird) und offene Einladungen.
// ─────────────────────────────────────────────────────────────────────────────

export type InviteState = "invalid" | "used" | "expired" | "open"

/** Zustand einer Einladung für die Einladungsseite. */
export function inviteState(
  invite: { accepted_at: string | null; expires_at: string } | null,
  now: Date = new Date(),
): InviteState {
  if (!invite) return "invalid"
  if (invite.accepted_at) return "used"
  return new Date(invite.expires_at).getTime() < now.getTime() ? "expired" : "open"
}

/** Wie lange ein Einladungslink gilt. Muss zu 035 (expires_at) passen. */
export const INVITE_VALID_DAYS = 14

export interface SeatState {
  /** Plätze inklusive Inhaber. null = unbegrenzt. */
  limit: number | null
  /** Belegt: Inhaber + Mitglieder + offene Einladungen. */
  used: number
  /** Noch frei. null = unbegrenzt. */
  free: number | null
}

export function seatState(limit: number | null, members: number, openInvites: number): SeatState {
  const used = 1 + Math.max(0, members) + Math.max(0, openInvites)
  return { limit, used, free: limit === null ? null : Math.max(0, limit - used) }
}

export function hasFreeSeat(state: SeatState): boolean {
  return state.free === null || state.free > 0
}

/** Kleinbuchstaben, ohne Leerzeichen. null, wenn es keine plausible Adresse ist. */
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null
  const email = value.trim().toLowerCase()
  if (email.length < 3 || email.length > 320) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : null
}

/** Ein Einladungs-Token hat genau die Form von randomBytes(32).toString("base64url"). */
export function plausibleInviteToken(token: unknown): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token)
}

/** Anzeigename aus Vor- und Nachname, sonst die Adresse. */
export function personName(first: string | null | undefined, last: string | null | undefined, email: string | null | undefined): string {
  const name = [first, last].map((v) => (v ?? "").trim()).filter(Boolean).join(" ")
  return name || email || "Unbekannt"
}

export type AcceptBlock =
  | "expired"
  | "used"
  | "wrong_email"
  | "own_team"
  | "already_member"
  | "has_members"
  | "other_team"
  | "paid_plan"
  | "no_seat"

/** Warum eine Einladung nicht angenommen werden kann, in der Ansprache der Oberfläche. */
export const ACCEPT_BLOCK_MESSAGE: Record<AcceptBlock, string> = {
  expired: "Diese Einladung ist abgelaufen. Bitte lass dich neu einladen.",
  used: "Diese Einladung wurde schon angenommen oder zurückgezogen.",
  wrong_email: "Diese Einladung gilt für eine andere E-Mail-Adresse. Melde dich mit der Adresse an, an die sie geschickt wurde.",
  own_team: "Das ist dein eigenes Team.",
  already_member: "Du bist bereits in diesem Team.",
  has_members: "Du hast selbst Teammitglieder. Entferne sie zuerst, dann kannst du einem anderen Team beitreten.",
  other_team: "Du bist bereits Mitglied in einem anderen Team. Verlasse es zuerst in den Einstellungen.",
  paid_plan: "Dein Konto hat ein eigenes Abo. Kündige es zuerst, damit du nicht doppelt zahlst.",
  no_seat: "Im Team ist gerade kein Platz frei. Bitte den Inhaber, einen Platz dazuzubuchen.",
}

export interface AcceptCheck {
  inviteEmail: string
  inviteExpiresAt: string
  inviteAcceptedAt: string | null
  ownerId: string
  userId: string
  userEmail: string | null
  /** Hat die Person selbst Mitglieder? */
  userHasMembers: boolean
  /** In welchem Team ist die Person schon Mitglied? */
  userMemberOf: string | null
  userPlan: string | null
  /** Mitglieder des einladenden Teams (aktiv und gesperrt). */
  teamMembers: number
  teamSeatLimit: number | null
  now?: Date
}

/** Prüft, ob eine Einladung angenommen werden darf. null = ja. */
export function acceptBlock(c: AcceptCheck): AcceptBlock | null {
  const now = c.now ?? new Date()
  if (c.inviteAcceptedAt) return "used"
  if (new Date(c.inviteExpiresAt).getTime() < now.getTime()) return "expired"
  if (c.userId === c.ownerId) return "own_team"
  if ((c.userEmail ?? "").trim().toLowerCase() !== c.inviteEmail) return "wrong_email"
  if (c.userMemberOf === c.ownerId) return "already_member"
  if (c.userMemberOf) return "other_team"
  if (c.userHasMembers) return "has_members"
  if (c.userPlan && c.userPlan !== "free") return "paid_plan"
  // Die Einladung selbst belegt einen Platz, der jetzt zum Mitglied wird.
  if (c.teamSeatLimit !== null && 1 + c.teamMembers >= c.teamSeatLimit) return "no_seat"
  return null
}
