import { z } from "zod"
import { cancelRun, confirmRun } from "@/lib/revy/agent"
import { revyRequest } from "@/lib/revy/http"

export const dynamic = "force-dynamic"
export const maxDuration = 120

const bodySchema = z.object({ aktion: z.enum(["kosten_bestaetigen", "bestaetigen", "abbrechen"]) })

/**
 * Abrechnungsdialog und Bestätigung: Der Nutzer bestätigt die Matches eines
 * Plans oder Änderungen an mehr als zehn Kandidaten, oder bricht ab.
 * Ausgeführt wird der gespeicherte Plan, unverändert. Das ist keine Freigabe
 * für Versand (NACH_AUSSEN), die gibt es nur über eine eigene Route.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) return Response.json({ error: "Unbekannter Lauf" }, { status: 404 })
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "Ungültige Anfrage" }, { status: 400 })
  const r = await revyRequest()
  if ("error" in r) return r.error

  if (parsed.data.aktion === "abbrechen") {
    const ok = await cancelRun(r.ctx, id)
    return ok ? Response.json({ status: "abgebrochen" }) : Response.json({ error: "Lauf nicht offen" }, { status: 409 })
  }
  try {
    const res = await confirmRun(r.ctx, id)
    if (!res) return Response.json({ error: "Lauf nicht offen" }, { status: 409 })
    return Response.json(res)
  } catch (err) {
    console.error("[revy] Ausführung nach Bestätigung fehlgeschlagen:", err)
    return Response.json({ error: "Revy ist gerade nicht erreichbar." }, { status: 500 })
  }
}
