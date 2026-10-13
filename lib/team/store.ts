import { createHash, randomBytes } from "node:crypto"
import { createClient as createAdmin, type SupabaseClient } from "@supabase/supabase-js"

import { seatLimit, type PlanId } from "@/lib/plans"
import { INVITE_VALID_DAYS, personName, seatState, type SeatState } from "./model"

// ─────────────────────────────────────────────────────────────────────────────
// Team: Zugriff auf die Datenbank (nur Server, service_role).
//
// workspace_members und workspace_invites sind für Konten gesperrt (035),
// gelesen und geschrieben wird nur hier. Wer was darf, prüfen die Routen
// vorher (requireOwner, Einladung passt zur angemeldeten Adresse).
// ─────────────────────────────────────────────────────────────────────────────

export function teamDb(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createAdmin(url, key, { auth: { persistSession: false } })
}

export function createInviteToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url")
  return { token, hash: hashInviteToken(token) }
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export interface TeamPerson {
  id: string
  name: string
  email: string | null
}

export interface TeamMember extends TeamPerson {
  active: boolean
  joinedAt: string
}

export interface TeamInvite {
  id: string
  email: string
  createdAt: string
  expiresAt: string
}

export interface TeamOverview {
  owner: TeamPerson & { plan: PlanId; extraSeats: number; company: string | null }
  members: TeamMember[]
  invites: TeamInvite[]
  seats: SeatState
}

type ProfileRow = { id: string; first_name: string | null; last_name: string | null; plan?: string | null; extra_seats?: number | null; company_name?: string | null }

async function emailOf(db: SupabaseClient, id: string): Promise<string | null> {
  const { data } = await db.auth.admin.getUserById(id)
  return data?.user?.email ?? null
}

/** Inhaber, Mitglieder, offene Einladungen und Plätze eines Teams. */
export async function loadTeam(db: SupabaseClient, ownerId: string): Promise<TeamOverview | null> {
  const { data: owner } = await db
    .from("user_profiles").select("id, first_name, last_name, plan, extra_seats, company_name").eq("id", ownerId).maybeSingle()
  if (!owner) return null
  const o = owner as ProfileRow

  const [{ data: memberRows }, { data: inviteRows }] = await Promise.all([
    db.from("workspace_members").select("member_id, active, joined_at").eq("owner_id", ownerId).order("joined_at"),
    db.from("workspace_invites").select("id, email, created_at, expires_at")
      .eq("owner_id", ownerId).is("accepted_at", null).gt("expires_at", new Date().toISOString())
      .order("created_at"),
  ])

  const memberIds = (memberRows ?? []).map((m) => m.member_id as string)
  const { data: profiles } = memberIds.length
    ? await db.from("user_profiles").select("id, first_name, last_name").in("id", memberIds)
    : { data: [] as ProfileRow[] }
  const byId = new Map((profiles as ProfileRow[] | null ?? []).map((p) => [p.id, p]))
  const emails = await Promise.all([ownerId, ...memberIds].map((id) => emailOf(db, id)))

  const members: TeamMember[] = (memberRows ?? []).map((m, i) => {
    const p = byId.get(m.member_id as string)
    const email = emails[i + 1]
    return {
      id: m.member_id as string,
      name: personName(p?.first_name, p?.last_name, email),
      email,
      active: m.active !== false,
      joinedAt: m.joined_at as string,
    }
  })
  const invites: TeamInvite[] = (inviteRows ?? []).map((r) => ({
    id: r.id as string, email: r.email as string, createdAt: r.created_at as string, expiresAt: r.expires_at as string,
  }))

  const plan = ((o.plan as PlanId | null) ?? "free") as PlanId
  const extraSeats = Number(o.extra_seats ?? 0)
  return {
    owner: {
      id: ownerId,
      name: personName(o.first_name, o.last_name, emails[0]),
      email: emails[0],
      plan,
      extraSeats,
      company: o.company_name ?? null,
    },
    members,
    invites,
    seats: seatState(seatLimit(plan, extraSeats), members.length, invites.length),
  }
}

/** Namen für das Entscheidungsprotokoll: Inhaber und Mitglieder des Teams. */
export async function teamDirectory(db: SupabaseClient, ownerId: string): Promise<Map<string, string>> {
  const team = await loadTeam(db, ownerId)
  const map = new Map<string, string>()
  if (!team) return map
  for (const p of [team.owner, ...team.members]) {
    map.set(p.id, p.email && p.name !== p.email ? `${p.name} (${p.email})` : p.name)
  }
  return map
}

/** Legt eine Einladung an. Eine offene Einladung an dieselbe Adresse wird ersetzt. */
export async function createInvite(
  db: SupabaseClient,
  ownerId: string,
  invitedBy: string,
  email: string,
): Promise<{ token: string; expiresAt: string } | { error: string }> {
  await db.from("workspace_invites").delete().eq("owner_id", ownerId).eq("email", email).is("accepted_at", null)
  const { token, hash } = createInviteToken()
  const expiresAt = new Date(Date.now() + INVITE_VALID_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const { error } = await db.from("workspace_invites").insert({
    owner_id: ownerId, email, token_hash: hash, invited_by: invitedBy, expires_at: expiresAt,
  })
  if (error) {
    console.error("[team] Einladung anlegen fehlgeschlagen:", error.message)
    return { error: /workspace_invites/.test(error.message) ? "migration_fehlt" : "Konnte die Einladung nicht anlegen." }
  }
  return { token, expiresAt }
}

export interface InviteRow {
  id: string
  owner_id: string
  email: string
  expires_at: string
  accepted_at: string | null
  invited_by: string | null
}

export async function inviteByToken(db: SupabaseClient, token: string): Promise<InviteRow | null> {
  const { data } = await db
    .from("workspace_invites")
    .select("id, owner_id, email, expires_at, accepted_at, invited_by")
    .eq("token_hash", hashInviteToken(token))
    .maybeSingle()
  return (data as InviteRow | null) ?? null
}

/** Was die Einladungsseite vor dem Login zeigen darf: Firma, wer einlädt, für welche Adresse. */
export async function invitePreview(db: SupabaseClient, invite: InviteRow): Promise<{ company: string; inviter: string; email: string }> {
  const ids = [invite.owner_id, invite.invited_by].filter(Boolean) as string[]
  const { data } = await db.from("user_profiles").select("id, first_name, last_name, company_name").in("id", ids)
  const rows = (data ?? []) as ProfileRow[]
  const owner = rows.find((r) => r.id === invite.owner_id)
  const inviter = rows.find((r) => r.id === (invite.invited_by ?? invite.owner_id)) ?? owner
  return {
    company: owner?.company_name || "ein Team",
    inviter: personName(inviter?.first_name, inviter?.last_name, null) === "Unbekannt"
      ? "Jemand aus dem Team"
      : personName(inviter?.first_name, inviter?.last_name, null),
    email: invite.email,
  }
}
