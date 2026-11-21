import { z } from "zod"
import { auditToCsv, readAudit } from "@/lib/revy/audit"
import { revyRequest } from "@/lib/revy/http"

export const dynamic = "force-dynamic"

const querySchema = z.object({
  format: z.enum(["json", "csv"]).default("json"),
  run: z.string().uuid().optional(),
  von: z.string().date().optional(),
  bis: z.string().date().optional(),
})

/** Export des Revy-Protokolls des eigenen Arbeitsbereichs (JSON oder CSV). */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) return Response.json({ error: "Ungültige Anfrage" }, { status: 400 })
  const r = await revyRequest()
  if ("error" in r) return r.error
  const q = parsed.data
  const rows = await readAudit(r.ctx.db, {
    runId: q.run,
    from: q.von ? `${q.von}T00:00:00Z` : undefined,
    to: q.bis ? `${q.bis}T23:59:59Z` : undefined,
  })
  const stamp = new Date().toISOString().slice(0, 10)
  if (q.format === "csv") {
    return new Response(auditToCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="revy-protokoll-${stamp}.csv"`,
      },
    })
  }
  return new Response(JSON.stringify({ exportiert_am: new Date().toISOString(), eintraege: rows }, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="revy-protokoll-${stamp}.json"`,
    },
  })
}
