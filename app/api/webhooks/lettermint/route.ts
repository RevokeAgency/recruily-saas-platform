import { adminClient } from "@/lib/scheduling/store"
import { applyDeliveryEvent } from "@/lib/revy/versand"
import { verifyLettermintSignature } from "@/lib/email/lettermint-webhook"

export const dynamic = "force-dynamic"

/**
 * Zustellstatus von Lettermint (Webhook). Geprüft wird die Signatur aus
 * X-Lettermint-Signature (HMAC-SHA256 über "{t}.{Rohtext}", höchstens fünf
 * Minuten alt). Ohne Secret nimmt die Route nichts an.
 *
 * In Lettermint: Webhook auf https://<domain>/api/webhooks/lettermint mit den
 * Ereignissen message.delivered, message.hard_bounced, message.soft_bounced,
 * message.failed, message.policy_rejected, message.suppressed,
 * message.spam_complaint. Secret als LETTERMINT_WEBHOOK_SECRET in Vercel.
 */
export async function POST(req: Request) {
  const secret = process.env.LETTERMINT_WEBHOOK_SECRET
  if (!secret) return Response.json({ error: "Webhook nicht eingerichtet" }, { status: 503 })
  const raw = await req.text()
  const ok = verifyLettermintSignature({
    secret,
    rawBody: raw,
    signature: req.headers.get("x-lettermint-signature"),
    deliveryHeader: req.headers.get("x-lettermint-delivery"),
  })
  if (!ok) return Response.json({ error: "Signatur ungültig" }, { status: 401 })
  let ev: unknown
  try {
    ev = JSON.parse(raw)
  } catch {
    return Response.json({ error: "Ungültiger Inhalt" }, { status: 400 })
  }
  try {
    const r = await applyDeliveryEvent(adminClient(), ev as Parameters<typeof applyDeliveryEvent>[1])
    return Response.json({ ok: true, ergebnis: r })
  } catch (err) {
    console.error("[lettermint-webhook] Verarbeitung fehlgeschlagen:", err)
    // 5xx: Lettermint versucht es später erneut.
    return Response.json({ error: "Verarbeitung fehlgeschlagen" }, { status: 500 })
  }
}
