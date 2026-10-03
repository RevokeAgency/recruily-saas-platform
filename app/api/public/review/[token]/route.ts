import { NextRequest, after } from "next/server"

import { logDecisions } from "@/lib/compliance/decision-log"
import { sendReviewCompleted } from "@/lib/email/review"
import { consumeRateLimit, requesterKey } from "@/lib/rate-limit"
import { parseVerdict, toCandidateView, type ReviewVerdict } from "@/lib/review/shared"
import { ITEM_SELECT, findLink, reviewDb, senderOf } from "@/lib/review/store"

export const dynamic = "force-dynamic"

const NO_STORE = { "Cache-Control": "no-store" }

/**
 * Urteil des Fachbereichs zu einem Bewerber, ohne Login. Der Link ist die
 * Berechtigung: gültig, nicht widerrufen, und der Bewerber gehört zum Link.
 * Bis zum Ablauf lässt sich das Urteil ändern.
 *
 * Sind alle Bewerber beurteilt, bekommt HR einmal eine Mail.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const db = reviewDb()
  if (!db) return Response.json({ error: "Gerade nicht verfügbar." }, { status: 503, headers: NO_STORE })

  const grenze = await consumeRateLimit(db, "review_public", requesterKey(req), 120, 3600)
  if (!grenze.allowed) {
    return Response.json({ error: "Zu viele Anfragen. Bitte versuche es später erneut." }, { status: 429, headers: NO_STORE })
  }

  const found = await findLink(db, token)
  if (!found.ok) {
    const msg = found.status === "expired" ? "Dieser Link ist abgelaufen." : found.status === "revoked" ? "Dieser Link wurde zurückgezogen." : "Link nicht gefunden."
    return Response.json({ error: msg }, { status: 410, headers: NO_STORE })
  }
  const { link } = found

  const parsed = parseVerdict(await req.json().catch(() => ({})))
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400, headers: NO_STORE })

  const { data: item, error } = await db
    .from("review_link_items")
    .update({ verdict: parsed.verdict, comment: parsed.comment, decided_at: new Date().toISOString() })
    .eq("id", parsed.itemId)
    .eq("link_id", link.id)
    .select("id, job_candidate_id")
    .maybeSingle()
  if (error) return Response.json({ error: "Speichern fehlgeschlagen." }, { status: 500, headers: NO_STORE })
  if (!item) return Response.json({ error: "Bewerber gehört nicht zu diesem Link." }, { status: 404, headers: NO_STORE })

  await logDecisions(db, [{
    userId: link.user_id, actorId: null, jobId: link.job_id, jobCandidateId: item.job_candidate_id as string,
    event: "rueckmeldung_fachbereich", detail: { urteil: parsed.verdict, kommentar: !!parsed.comment },
  }])

  // Alle beurteilt? Dann genau einmal HR benachrichtigen. Das bedingte
  // Update verhindert eine doppelte Mail, wenn zwei Urteile gleichzeitig
  // ankommen.
  const { data: items } = await db.from("review_link_items").select(ITEM_SELECT).eq("link_id", link.id).order("position")
  const views = ((items ?? []) as unknown as Record<string, unknown>[]).filter((i) => i.job_candidate).map(toCandidateView)
  const done = views.length > 0 && views.every((v) => v.verdict)
  if (done && !link.completed_at) {
    const { data: claimed } = await db
      .from("review_links")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", link.id)
      .is("completed_at", null)
      .select("id")
      .maybeSingle()
    if (claimed) {
      after(async () => {
        const [{ data: job }, sender] = await Promise.all([
          db.from("jobs").select("title").eq("id", link.job_id).maybeSingle(),
          senderOf(db, link.user_id),
        ])
        if (!sender.email) return
        await sendReviewCompleted({
          to: sender.email,
          reviewerName: link.reviewer_name,
          jobId: link.job_id,
          jobTitle: (job?.title as string) || "deine Stelle",
          items: views.map((v) => ({ name: v.name, verdict: v.verdict as ReviewVerdict, comment: v.comment })),
        })
      })
    }
  }

  return Response.json({ saved: true, done }, { headers: NO_STORE })
}
