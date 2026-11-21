import { revyRequest } from "@/lib/revy/http"
import { revyStatus } from "@/lib/revy/status"

export const dynamic = "force-dynamic"

/** Ist Revy eingerichtet? Für den Hinweis im Revy-Fenster. */
export async function GET() {
  const r = await revyRequest()
  if ("error" in r) return r.error
  return Response.json(await revyStatus(r.ctx))
}
