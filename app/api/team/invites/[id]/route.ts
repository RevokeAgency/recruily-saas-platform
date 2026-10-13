import { createClient } from "@/lib/supabase/server"
import { teamDb } from "@/lib/team/store"
import { getWorkspace, requireOwner } from "@/lib/workspace"

export const dynamic = "force-dynamic"

/** Zieht eine offene Einladung zurück. Der Link funktioniert danach nicht mehr. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })
  const ws = await getWorkspace(supabase, user.id)
  const ownerOnly = requireOwner(ws, "Einladungen zurückziehen")
  if (ownerOnly) return ownerOnly

  const db = teamDb()
  if (!db) return Response.json({ error: "Server nicht konfiguriert" }, { status: 500 })

  const { error } = await db
    .from("workspace_invites").delete().eq("id", id).eq("owner_id", ws.ownerId).is("accepted_at", null)
  if (error) return Response.json({ error: "Konnte die Einladung nicht zurückziehen." }, { status: 500 })
  return Response.json({ ok: true })
}
