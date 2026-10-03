import { NextRequest } from "next/server"

import { logDecisions } from "@/lib/compliance/decision-log"
import { requireFeature } from "@/lib/quota"
import { consumeRateLimit } from "@/lib/rate-limit"
import { renderReport } from "@/lib/report/document"
import { loadReport } from "@/lib/report/load"
import { parseReportRequest, reportFileName } from "@/lib/report/model"
import { reviewDb } from "@/lib/review/store"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 60

/**
 * Revetly Report: PDF-Profil eines Kandidaten oder Shortlist mit bis zu zehn,
 * anonym oder mit Namen. Ab Growth. Wird nicht gespeichert, sondern direkt
 * ausgeliefert; im Entscheidungsprotokoll steht, wann wer einen Report über
 * wen erstellt hat, damit die Weitergabe an Dritte nachvollziehbar bleibt.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

  const locked = await requireFeature(supabase, user.id, "report", "Den Revetly Report")
  if (locked) return locked

  const parsed = parseReportRequest(await req.json().catch(() => ({})))
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 })

  const admin = reviewDb()
  if (admin) {
    const grenze = await consumeRateLimit(admin, "report_user", user.id, 60, 3600)
    if (!grenze.allowed) {
      return Response.json({ error: "Zu viele Reports in kurzer Zeit. Bitte später erneut versuchen." }, { status: 429 })
    }
  }

  const loaded = await loadReport(supabase, admin, user.id, parsed.value)
  if (!loaded.ok) return Response.json({ error: loaded.error }, { status: loaded.status })

  let pdf: Buffer
  try {
    pdf = await renderReport(loaded.data)
  } catch (err) {
    console.error("[reports] PDF konnte nicht erstellt werden:", err)
    return Response.json({ error: "PDF konnte nicht erstellt werden." }, { status: 500 })
  }

  await logDecisions(supabase, parsed.value.jobCandidateIds.map((id) => ({
    userId: user.id, actorId: user.id, jobId: parsed.value.jobId, jobCandidateId: id,
    event: "report_erstellt",
    detail: { anonym: parsed.value.anonymous, kandidaten: parsed.value.jobCandidateIds.length },
  })))

  const name = reportFileName(loaded.data.jobTitle, loaded.data.createdAt, parsed.value.anonymous)
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  })
}
