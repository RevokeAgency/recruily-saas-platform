import { after } from "next/server"
import { z } from "zod"
import { revyRequest } from "@/lib/revy/http"
import { processDue } from "@/lib/revy/versand"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Fortschritt des Versands für die Freigabe-Ansicht. Stößt nebenbei fällige
 * Mails dieses Stapels an (ohne Warten), damit die Staffelung auch dann
 * weiterläuft, wenn der erste Lauf nach der Freigabe vorbei ist.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) return Response.json({ error: "Entwurf nicht gefunden" }, { status: 404 })
  const r = await revyRequest()
  if ("error" in r) return r.error
  // Lesen mit der Sitzung des Nutzers (RLS: eigener Arbeitsbereich).
  const { data: batch } = await r.ctx.db.from("revy_batches").select("id, status").eq("id", id).maybeSingle()
  if (!batch) return Response.json({ error: "Entwurf nicht gefunden" }, { status: 404 })
  const { data } = await r.ctx.db
    .from("revy_deliveries")
    .select("draft_id, ref, status, fehler, gesendet_am, zugestellt_am, geplant_am")
    .eq("batch_id", id)
    .order("geplant_am", { ascending: true })
  const zustellungen = data ?? []
  if (zustellungen.some((z) => z.status === "geplant")) {
    const admin = r.ctx.admin
    after(() => processDue(admin, { batchId: id, deadline: Date.now() + 45_000, warten: false }).then(() => undefined))
  }
  return Response.json({ status: batch.status, zustellungen }, { headers: { "Cache-Control": "no-store" } })
}
