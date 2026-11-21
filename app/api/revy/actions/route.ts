import { listActions } from "@/lib/revy/actions"
import { revyRequest } from "@/lib/revy/http"

export const dynamic = "force-dynamic"

/** Die letzten Änderungen von Revy im Arbeitsbereich, mit Rücknahme-Stand. */
export async function GET() {
  const r = await revyRequest()
  if ("error" in r) return r.error
  try {
    return Response.json({ aktionen: await listActions(r.ctx) })
  } catch (err) {
    console.error("[revy] Änderungen nicht lesbar:", err)
    return Response.json({ error: "Änderungen sind gerade nicht lesbar." }, { status: 500 })
  }
}
