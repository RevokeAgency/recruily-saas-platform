import { NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { consumeRateLimit, tooManyRequests } from "@/lib/rate-limit"
import { seatLimit, type PlanId } from "@/lib/plans"
import { ACCEPT_BLOCK_MESSAGE, acceptBlock, plausibleInviteToken } from "@/lib/team/model"
import { inviteByToken, teamDb } from "@/lib/team/store"

export const dynamic = "force-dynamic"

/**
 * Nimmt eine Einladung an. Die angemeldete Adresse muss die eingeladene
 * sein; so hilft ein weitergeleiteter Link niemand anderem ins Team.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  if (!plausibleInviteToken(body.token)) {
    return Response.json({ error: "Diese Einladung ist ungültig." }, { status: 404 })
  }

  const db = teamDb()
  if (!db) return Response.json({ error: "Server nicht konfiguriert" }, { status: 500 })

  const grenze = await consumeRateLimit(db, "team_accept_user", user.id, 20, 3600)
  if (!grenze.allowed) return tooManyRequests(grenze, "Zu viele Versuche. Bitte versuche es später erneut.")

  const invite = await inviteByToken(db, body.token)
  if (!invite) return Response.json({ error: "Diese Einladung ist ungültig." }, { status: 404 })

  const [{ data: owner }, { data: me }, { data: myMembership }, { count: myMembers }, { count: teamMembers }] = await Promise.all([
    db.from("user_profiles").select("plan, extra_seats").eq("id", invite.owner_id).maybeSingle(),
    db.from("user_profiles").select("plan").eq("id", user.id).maybeSingle(),
    db.from("workspace_members").select("owner_id").eq("member_id", user.id).maybeSingle(),
    db.from("workspace_members").select("member_id", { count: "exact", head: true }).eq("owner_id", user.id),
    db.from("workspace_members").select("member_id", { count: "exact", head: true }).eq("owner_id", invite.owner_id),
  ])

  const block = acceptBlock({
    inviteEmail: invite.email,
    inviteExpiresAt: invite.expires_at,
    inviteAcceptedAt: invite.accepted_at,
    ownerId: invite.owner_id,
    userId: user.id,
    userEmail: user.email ?? null,
    userHasMembers: (myMembers ?? 0) > 0,
    userMemberOf: (myMembership?.owner_id as string | undefined) ?? null,
    userPlan: (me?.plan as string | null) ?? null,
    teamMembers: teamMembers ?? 0,
    teamSeatLimit: seatLimit(owner?.plan as PlanId, Number(owner?.extra_seats ?? 0)),
  })
  if (block) return Response.json({ error: ACCEPT_BLOCK_MESSAGE[block], code: block }, { status: 409 })

  const { error: joinErr } = await db
    .from("workspace_members")
    .insert({ member_id: user.id, owner_id: invite.owner_id })
  if (joinErr) {
    console.error("[team] Beitritt fehlgeschlagen:", joinErr.message)
    return Response.json({ error: "Beitritt fehlgeschlagen. Bitte versuche es erneut." }, { status: 500 })
  }

  await Promise.all([
    db.from("workspace_invites")
      .update({ accepted_at: new Date().toISOString(), accepted_by: user.id })
      .eq("id", invite.id),
    // Mitglieder richten keine eigene Firma ein, die des Teams gilt.
    db.from("user_profiles").update({ onboarded: true }).eq("id", user.id),
  ])

  return Response.json({ ok: true })
}
