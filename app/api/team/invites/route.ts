import { NextRequest } from "next/server"

import { sendTeamInvite } from "@/lib/email/team"
import { consumeRateLimit, tooManyRequests } from "@/lib/rate-limit"
import { absoluteUrl } from "@/lib/site"
import { createClient } from "@/lib/supabase/server"
import { hasFreeSeat, normalizeEmail, personName } from "@/lib/team/model"
import { createInvite, loadTeam, teamDb } from "@/lib/team/store"
import { getWorkspace, requireOwner } from "@/lib/workspace"

export const dynamic = "force-dynamic"

/** Lädt eine Person per Mail ins Team ein. Nur der Inhaber, nur mit freiem Platz. */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })
  const ws = await getWorkspace(supabase, user.id)
  const ownerOnly = requireOwner(ws, "Teammitglieder einladen")
  if (ownerOnly) return ownerOnly

  const body = await req.json().catch(() => ({}))
  const email = normalizeEmail(body.email)
  if (!email) return Response.json({ error: "Bitte gib eine gültige E-Mail-Adresse ein." }, { status: 400 })
  if (email === (user.email ?? "").toLowerCase()) {
    return Response.json({ error: "Das ist deine eigene Adresse." }, { status: 400 })
  }

  const db = teamDb()
  if (!db) return Response.json({ error: "Server nicht konfiguriert" }, { status: 500 })

  const grenze = await consumeRateLimit(db, "team_invite_user", user.id, 20, 3600)
  if (!grenze.allowed) return tooManyRequests(grenze, "Zu viele Einladungen in kurzer Zeit. Bitte versuche es später erneut.")

  const team = await loadTeam(db, ws.ownerId)
  if (!team) return Response.json({ error: "Profil nicht gefunden" }, { status: 404 })
  if (team.members.some((m) => (m.email ?? "").toLowerCase() === email)) {
    return Response.json({ error: "Diese Person ist schon im Team." }, { status: 409 })
  }
  // Eine erneute Einladung an dieselbe Adresse ersetzt die alte und belegt
  // keinen zusätzlichen Platz.
  const resend = team.invites.some((i) => i.email === email)
  if (!resend && !hasFreeSeat(team.seats)) {
    return Response.json(
      { error: "Alle Plätze sind belegt. Buche einen Platz dazu oder entferne ein Mitglied.", seats: team.seats, upgrade: true },
      { status: 409 },
    )
  }

  const created = await createInvite(db, ws.ownerId, user.id, email)
  if ("error" in created) {
    return Response.json({ error: created.error }, { status: created.error === "migration_fehlt" ? 503 : 500 })
  }

  const { data: me } = await db.from("user_profiles").select("first_name, last_name").eq("id", user.id).maybeSingle()
  const sent = await sendTeamInvite({
    to: email,
    inviterName: personName(me?.first_name as string | null, me?.last_name as string | null, user.email),
    inviterEmail: user.email ?? null,
    company: team.owner.company ?? "",
    url: absoluteUrl(`/team/einladung/${created.token}`),
    expiresAt: created.expiresAt,
  })

  return Response.json({ ok: true, sent, resend, expiresAt: created.expiresAt })
}
