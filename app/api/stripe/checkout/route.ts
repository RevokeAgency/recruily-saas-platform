import { NextRequest } from "next/server"
import { createClient as createServer } from "@/lib/supabase/server"
import { createClient as createAdmin } from "@supabase/supabase-js"
import {
  getStripe,
  ensurePrice,
  ensurePortalConfiguration,
  PAID_PLANS,
  type PaidPlanId,
  type BillingInterval,
} from "@/lib/stripe/server"

export const dynamic = "force-dynamic"

/**
 * Starts a subscription purchase. For customers without an active paid
 * subscription this returns a Stripe Checkout URL; customers who already have
 * one are sent to the customer portal instead (up-/downgrades there, with
 * proration handled by Stripe — never a second parallel subscription).
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const plan = body.plan as PaidPlanId
    const interval: BillingInterval = body.interval === "yearly" ? "yearly" : "monthly"
    if (!PAID_PLANS.includes(plan)) {
      return Response.json({ error: "Ungültiger Plan" }, { status: 400 })
    }

    const stripe = getStripe()
    const origin = new URL(req.url).origin

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )
    const { data: profile } = await admin
      .from("user_profiles")
      .select("plan, stripe_customer_id, stripe_subscription_id")
      .eq("id", user.id)
      .single()

    // Ensure a Stripe customer exists and is remembered.
    let customerId = profile?.stripe_customer_id as string | null
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { user_id: user.id },
      })
      customerId = customer.id
      await admin.from("user_profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id)
        .then(({ error }) => { if (error) console.error("[stripe] customer save skipped:", error.message) })
    }

    // Existing paid subscription → manage in the portal instead of re-buying.
    if (profile?.stripe_subscription_id && profile.plan !== "free") {
      const configuration = await ensurePortalConfiguration(stripe)
      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        configuration,
        return_url: `${origin}/subscription`,
      })
      return Response.json({ url: portal.url, portal: true })
    }

    const priceId = await ensurePrice(stripe, plan, interval)
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/subscription?success=1`,
      cancel_url: `${origin}/subscription?canceled=1`,
      client_reference_id: user.id,
      allow_promotion_codes: true,
      billing_address_collection: "required",
      subscription_data: { metadata: { user_id: user.id, plan } },
      metadata: { user_id: user.id, plan, interval },
    })

    return Response.json({ url: session.url })
  } catch (error) {
    console.error("[stripe checkout] error:", error)
    return Response.json({ error: "Checkout konnte nicht gestartet werden" }, { status: 500 })
  }
}
