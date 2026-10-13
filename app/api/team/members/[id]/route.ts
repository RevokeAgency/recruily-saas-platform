import { createClient } from "@/lib/supabase/server"
import { teamDb } from "@/lib/team/store"
import { getWorkspace } from "@/lib/workspace"

export const dynamic = "force-dynamic"

/**
 * Entfernt ein Mitglied. Der Inhaber darf jedes Mitglied entfernen, ein
 * Mitglied nur sich selbst (Team verlassen). Daten bleiben beim Team; das
 * Konto der Person besteht weiter, ohne Zugriff auf das Team.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })
  const ws = await getWorkspace(supabase, user.id)

  const leaving = id === user.id
  if (!leaving && ws.role !== "owner") {
    return Response.json({ error: "Mitglieder entfernen kann nur der Inhaber des Kontos.", owner_only: true }, { status: 403 })
  }
  if (leaving && ws.role === "owner") {
    return Response.json({ error: "Als Inhaber kannst du dein eigenes Team nicht verlassen." }, { status: 400 })
  }

  const db = teamDb()
  if (!db) return Response.json({ error: "Server nicht konfiguriert" }, { status: 500 })

  const { data, error } = await db
    .from("workspace_members")
    .delete()
    .eq("member_id", id)
    .eq("owner_id", ws.teamOwnerId)
    .select("member_id")
  if (error) return Response.json({ error: "Konnte das Mitglied nicht entfernen." }, { status: 500 })
  if (!data?.length) return Response.json({ error: "Mitglied nicht gefunden." }, { status: 404 })
  return Response.json({ ok: true, left: leaving })
}
