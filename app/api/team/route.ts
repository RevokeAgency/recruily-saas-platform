import { createClient } from "@/lib/supabase/server"
import { canBuyExtraSeats } from "@/lib/plans"
import { loadTeam, teamDb } from "@/lib/team/store"
import { getWorkspace } from "@/lib/workspace"

export const dynamic = "force-dynamic"

/**
 * Team des Arbeitsbereichs: Inhaber, Mitglieder, offene Einladungen, Plätze.
 * Mitglieder sehen die Liste auch, ändern kann sie nur der Inhaber.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })
  const ws = await getWorkspace(supabase, user.id)

  const db = teamDb()
  if (!db) return Response.json({ error: "Server nicht konfiguriert" }, { status: 500 })

  const probe = await db.from("workspace_members").select("member_id").limit(1)
  if (probe.error) return Response.json({ error: "migration_fehlt" }, { status: 503 })

  const team = await loadTeam(db, ws.teamOwnerId)
  if (!team) return Response.json({ error: "Profil nicht gefunden" }, { status: 404 })

  return Response.json({
    role: ws.role,
    active: ws.active,
    me: user.id,
    canBuyExtraSeats: canBuyExtraSeats(team.owner.plan),
    // Mitglieder sehen keine offenen Einladungen an fremde Adressen.
    ...team,
    invites: ws.role === "owner" ? team.invites : [],
  })
}
