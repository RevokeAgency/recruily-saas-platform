import { after } from "next/server"
import { z } from "zod"
import { approveBatch, cancelBatch, openBatch, setTone } from "@/lib/revy/freigabe"
import { revyRequest } from "@/lib/revy/http"
import { processDue } from "@/lib/revy/versand"

export const dynamic = "force-dynamic"
export const maxDuration = 300

const idSchema = z.string().uuid()

/**
 * Freigabe-Ansicht: Entwürfe eines Stapels. Solange er offen ist, mit einem
 * frischen Einmal-Token für die Freigabe (lib/revy/freigabe.ts).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!idSchema.safeParse(id).success) return Response.json({ error: "Entwurf nicht gefunden" }, { status: 404 })
  const r = await revyRequest()
  if ("error" in r) return r.error
  const res = await openBatch(r.ctx, id)
  if ("ok" in res && res.ok === false) return Response.json({ error: res.error }, { status: res.status })
  return Response.json(res, { headers: { "Cache-Control": "no-store" } })
}

const bodySchema = z.discriminatedUnion("aktion", [
  z.object({ aktion: z.literal("ton"), ton: z.string().max(20) }),
  z.object({ aktion: z.literal("freigeben"), token: z.string().min(20).max(100), ausgewaehlt: z.array(z.string().uuid()).min(1).max(50) }),
  z.object({ aktion: z.literal("abbrechen") }),
])

/**
 * Ton ändern, freigeben oder abbrechen. Freigeben ist der einzige Weg, auf
 * dem Revy-Entwürfe verschickt werden: nur mit dem Einmal-Token aus GET.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!idSchema.safeParse(id).success) return Response.json({ error: "Entwurf nicht gefunden" }, { status: 404 })
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "Ungültige Anfrage" }, { status: 400 })
  const r = await revyRequest()
  if ("error" in r) return r.error
  const body = parsed.data

  if (body.aktion === "ton") {
    const res = await setTone(r.ctx, id, body.ton)
    return res.ok ? Response.json({ ok: true }) : Response.json({ error: res.error }, { status: res.status })
  }
  if (body.aktion === "abbrechen") {
    const res = await cancelBatch(r.ctx, id)
    return res.ok ? Response.json(res) : Response.json({ error: res.error }, { status: res.status })
  }
  const res = await approveBatch(r.ctx, id, { token: body.token, ausgewaehlt: body.ausgewaehlt })
  if (!res.ok) return Response.json({ error: res.error }, { status: res.status })
  // Gestaffelt verschicken, nachdem die Antwort raus ist.
  const admin = r.ctx.admin
  after(() => processDue(admin, { batchId: id, deadline: Date.now() + 270_000 }).then(() => undefined))
  return Response.json(res)
}
