import { z } from "zod"
import { runCommand } from "@/lib/revy/agent"
import { revyRequest } from "@/lib/revy/http"

export const dynamic = "force-dynamic"
export const maxDuration = 120

const bodySchema = z.object({
  befehl: z.string().trim().min(1).max(1000),
  sessionId: z.string().uuid(),
  stelleId: z.string().uuid().nullable().optional(),
})

/** Ein Befehl an Revy. Antwort mit Plan, Ergebnissen und belegten Aussagen. */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "Ungültige Anfrage" }, { status: 400 })
  const r = await revyRequest({ rateLimit: true })
  if ("error" in r) return r.error
  try {
    const res = await runCommand(r.ctx, {
      befehl: parsed.data.befehl,
      sessionId: parsed.data.sessionId,
      scope: { stelleId: parsed.data.stelleId ?? null },
    })
    return Response.json(res)
  } catch (err) {
    console.error("[revy] Befehl fehlgeschlagen:", err)
    return Response.json({ error: "Revy ist gerade nicht erreichbar." }, { status: 500 })
  }
}
