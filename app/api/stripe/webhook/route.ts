import { NextRequest } from "next/server"
import type Stripe from "stripe"
import { createClient as createAdmin } from "@supabase/supabase-js"
import {
  getStripe,
  bestActiveSubscription,
  cancelExtraSubscriptions,
  subLookupKey,
  subCurrentPeriodEnd,
} from "@/lib/stripe/server"
import { syncSubscriptionToProfile, type SubscriptionState } from "@/lib/stripe/sync"

export const dynamic = "force-dynamic"

function serviceClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

type Admin = ReturnType<typeof serviceClient>

/**
 * Re-derives the customer's plan from their *currently-active* subscriptions at
 * Stripe (not from the single event object) and writes it to user_profiles.
 * Idempotent and order-independent: duplicate purchases, plan switches and
 * partial cancellations all converge on the right plan (or Free when nothing is
 * active).
 */
async function syncCustomer(
  stripe: Stripe,
  admin: Admin,
  customerId: string,
  userId: string | null,
): Promise<void> {
  const best = await bestActiveSubscription(stripe, customerId)

  // One subscription per customer: cancel any other active ones (guards the
  // rare parallel-checkout race that could otherwise stack duplicates).
  if (best) {
    const cancelled = await cancelExtraSubscriptions(stripe, customerId, best.id)
    if (cancelled > 0) console.warn(`[stripe webhook] cancelled ${cancelled} duplicate subscription(s) for ${customerId}`)
  }

  const state: SubscriptionState = best
    ? {
        userId,
        customerId,
        subscriptionId: best.id,
        status: best.status,
        lookupKey: subLookupKey(best),
        periodEnd: subCurrentPeriodEnd(best),
      }
    : { userId, customerId, subscriptionId: null, status: "canceled", lookupKey: null, periodEnd: null }

  const error = await syncSubscriptionToProfile(admin, state)
  if (error) console.error("[stripe webhook] profile sync failed:", error)
}

/**
 * Stripe webhook: keeps user_profiles.plan (and mirrored limit columns) in sync
 * with the subscription lifecycle. Signature-verified; writes via the service
 * role. Handles checkout completion and subscription create/update/delete —
 * each just re-syncs the customer from their live Stripe state.
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
        if (session.mode !== "subscription" || !session.customer) break
        await syncCustomer(
          stripe,
          admin,
          session.customer as string,
          session.client_reference_id ?? session.metadata?.user_id ?? null,
        )
        break
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription
        await syncCustomer(stripe, admin, sub.customer as string, sub.metadata?.user_id ?? null)
        break
      }
      default:
        break
    }
  } catch (err) {
    // Log but return 200 — Stripe retries on non-2xx and we never want a retry
    // storm on a poison event; the next lifecycle event re-syncs.
    console.error("[stripe webhook] handler error:", err)
  }

  return Response.json({ received: true })
}
