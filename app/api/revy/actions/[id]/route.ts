import { z } from "zod"
import { undoAction } from "@/lib/revy/actions"
import { revyRequest } from "@/lib/revy/http"

export const dynamic = "force-dynamic"

/** Eine Änderung von Revy zurücknehmen. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) return Response.json({ error: "Unbekannte Änderung" }, { status: 404 })
  const body = await req.json().catch(() => null)
  if (body?.aktion !== "zuruecknehmen") return Response.json({ error: "Ungültige Anfrage" }, { status: 400 })
  const r = await revyRequest()
  if ("error" in r) return r.error
  const res = await undoAction(r.ctx, id)
  return res.ok ? Response.json({ ok: true }) : Response.json({ error: res.grund }, { status: 409 })
}
