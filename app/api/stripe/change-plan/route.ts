import { NextRequest } from "next/server"
import { createClient as createServer } from "@/lib/supabase/server"
import { createClient as createAdmin } from "@supabase/supabase-js"
import {
  getStripe,
  ensurePrice,
  bestActiveSubscription,
  planFromLookupKey,
  subLookupKey,
  subPriceId,
  subItemId,
  subCurrentPeriodEnd,
  effectiveRank,
  PAID_PLANS,
  type PaidPlanId,
  type BillingInterval,
} from "@/lib/stripe/server"

export const dynamic = "force-dynamic"

/**
 * Changes an existing subscriber's plan:
 *   - Upgrade   (higher tier) → applied immediately, prorated difference charged
 *                               now on the card on file.
 *   - Downgrade (lower tier)  → scheduled at period end via a subscription
 *                               schedule; the current (higher) plan keeps
 *                               running, paid, until then.
 * Customers without an active subscription get { needsCheckout: true } so the
 * client falls back to a fresh Checkout.
 */
export async function POST(req: NextRequest) {
  try {
    const server = await createServer()
    const { data: { user } } = await server.auth.getUser()
    if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const plan = body.plan as PaidPlanId
    const interval: BillingInterval = body.interval === "yearly" ? "yearly" : "monthly"
    if (!PAID_PLANS.includes(plan)) return Response.json({ error: "Ungültiger Plan" }, { status: 400 })

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )
    const { data: profile } = await admin
      .from("user_profiles").select("stripe_customer_id").eq("id", user.id).single()
    const customerId = profile?.stripe_customer_id as string | null
    if (!customerId) return Response.json({ needsCheckout: true })

    const stripe = getStripe()
    const sub = await bestActiveSubscription(stripe, customerId)
    if (!sub) return Response.json({ needsCheckout: true })

    const current = planFromLookupKey(subLookupKey(sub))
    if (!current) return Response.json({ needsCheckout: true })

    const targetRank = effectiveRank(plan, interval)
    const currentRank = effectiveRank(current.plan, current.interval)
    if (targetRank === currentRank) {
      return Response.json({ ok: true, noop: true, plan })
    }

    const newPriceId = await ensurePrice(stripe, plan, interval)
    const scheduleId = typeof sub.schedule === "string" ? sub.schedule : sub.schedule?.id

    if (targetRank > currentRank) {
      // Upgrade → immediate, invoice the prorated difference now.
      if (scheduleId) await stripe.subscriptionSchedules.release(scheduleId)
      const itemId = subItemId(sub)
      await stripe.subscriptions.update(sub.id, {
        items: [{ id: itemId!, price: newPriceId }],
        proration_behavior: "always_invoice",
        payment_behavior: "error_if_incomplete",
      })
      return Response.json({ ok: true, direction: "upgrade", plan, effectiveAt: "now" })
    }

    // Downgrade → keep the current plan until period end, then switch.
    let schedId = scheduleId
    if (!schedId) {
      const created = await stripe.subscriptionSchedules.create({ from_subscription: sub.id })
      schedId = created.id
    }
    const schedule = await stripe.subscriptionSchedules.retrieve(schedId)
    const cur = schedule.phases[0]
    const currentPriceId = subPriceId(sub)!
    await stripe.subscriptionSchedules.update(schedId, {
      end_behavior: "release",
      proration_behavior: "none",
      phases: [
        { items: [{ price: currentPriceId, quantity: 1 }], start_date: cur.start_date, end_date: cur.end_date },
        { items: [{ price: newPriceId, quantity: 1 }] },
      ],
    })
    return Response.json({
      ok: true,
      direction: "downgrade",
      plan,
      effectiveAt: subCurrentPeriodEnd(sub),
    })
  } catch (error) {
    console.error("[stripe change-plan] error:", error)
    return Response.json({ error: "Planwechsel fehlgeschlagen" }, { status: 500 })
  }
}
