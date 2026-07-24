import { NextRequest } from "next/server"
import type Stripe from "stripe"
import { createClient as createAdmin } from "@supabase/supabase-js"
import { getStripe } from "@/lib/stripe/server"
import { syncSubscriptionToProfile } from "@/lib/stripe/sync"

export const dynamic = "force-dynamic"

function serviceClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

// current_period_end lives on the subscription in older API versions and on
// the subscription item in newer ones — accept both.
function periodEndOf(sub: Stripe.Subscription): number | null {
  const direct = (sub as unknown as { current_period_end?: number }).current_period_end
  if (typeof direct === "number") return direct
  const item = sub.items?.data?.[0] as unknown as { current_period_end?: number } | undefined
  return typeof item?.current_period_end === "number" ? item.current_period_end : null
}

function lookupKeyOf(sub: Stripe.Subscription): string | null {
  return sub.items?.data?.[0]?.price?.lookup_key ?? null
}

/**
 * Stripe webhook: keeps user_profiles.plan (and the mirrored limit columns)
 * in sync with the subscription lifecycle. Signature-verified; writes via the
 * service role. Handled events:
 *   - checkout.session.completed         → activate plan (user id from metadata)
 *   - customer.subscription.updated      → plan switch / renewal / cancel-at-end
 *   - customer.subscription.deleted      → back to Free
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    console.error("[stripe webhook] STRIPE_WEBHOOK_SECRET is not set")
    return Response.json({ error: "webhook not configured" }, { status: 500 })
  }

  const stripe = getStripe()
  const rawBody = await req.text()
  const signature = req.headers.get("stripe-signature")

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature ?? "", secret)
  } catch (err) {
    console.error("[stripe webhook] signature verification failed:", err)
    return Response.json({ error: "invalid signature" }, { status: 400 })
  }

  const admin = serviceClient()

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== "subscription" || !session.subscription) break
        const sub = await stripe.subscriptions.retrieve(session.subscription as string)
        const error = await syncSubscriptionToProfile(admin, {
          userId: session.client_reference_id ?? session.metadata?.user_id ?? null,
          customerId: session.customer as string,
          subscriptionId: sub.id,
          status: sub.status,
          lookupKey: lookupKeyOf(sub),
          periodEnd: periodEndOf(sub),
        })
        if (error) console.error("[stripe webhook] profile sync failed:", error)
        break
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription
        const error = await syncSubscriptionToProfile(admin, {
          userId: sub.metadata?.user_id ?? null,
          customerId: sub.customer as string,
          subscriptionId: sub.id,
          status: event.type === "customer.subscription.deleted" ? "canceled" : sub.status,
          lookupKey: lookupKeyOf(sub),
          periodEnd: periodEndOf(sub),
        })
        if (error) console.error("[stripe webhook] profile sync failed:", error)
        break
      }
      default:
        break
    }
  } catch (err) {
    // Log but return 200 — Stripe retries on non-2xx and we never want a
    // retry storm on a poison event; the next lifecycle event re-syncs.
    console.error("[stripe webhook] handler error:", err)
  }

  return Response.json({ received: true })
}
