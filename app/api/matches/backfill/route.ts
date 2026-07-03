import { rescoreQueuedMatches } from "@/app/actions/match"

/**
 * Re-scores applications that were stored while the customer was over their
 * limit (status 'queued'). Safe to call repeatedly — it is a no-op when there
 * is nothing queued or no quota left. Triggered lazily from the dashboard and
 * intended to also be called by the Stripe webhook on upgrade (later phase).
 */
export async function POST() {
  try {
    const result = await rescoreQueuedMatches()
    return Response.json({ success: true, ...result })
  } catch (error) {
    console.error("[backfill] failed:", error)
    return Response.json({ error: "Backfill fehlgeschlagen" }, { status: 500 })
  }
}
