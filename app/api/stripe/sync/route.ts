import { NextRequest } from "next/server"
import type Stripe from "stripe"
import { createClient as createServer } from "@/lib/supabase/server"
import { createClient as createAdmin } from "@supabase/supabase-js"
import { getStripe, bestActiveSubscription, subLookupKey } from "@/lib/stripe/server"
import { syncSubscriptionToProfile, profileUpdateFor, type SubscriptionState } from "@/lib/stripe/sync"

export const dynamic = "force-dynamic"

function admin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

function periodEndOf(sub: Stripe.Subscription): number | null {
  const direct = (sub as unknown as { current_period_end?: number }).current_period_end
  if (typeof direct === "number") return direct
  const item = sub.items?.data?.[0] as unknown as { current_period_end?: number } | undefined
  return typeof item?.current_period_end === "number" ? item.current_period_end : null
}

async function resolve(stripe: Stripe, customerId: string, userId: string): Promise<SubscriptionState> {
  const best = await bestActiveSubscription(stripe, customerId)
  return best
    ? { userId, customerId, subscriptionId: best.id, status: best.status, lookupKey: subLookupKey(best), periodEnd: periodEndOf(best) }
    : { userId, customerId, subscriptionId: null, status: "canceled", lookupKey: null, periodEnd: null }
}

/**
 * Self-heal: re-resolve the signed-in user's plan from their live Stripe
 * subscriptions and write the authoritative limits to user_profiles. Safe to
 * call anytime; the subscription page calls it on load so the account can
 * never drift from Stripe.
 */
export async function POST() {
  try {
    const server = await createServer()
    const { data: { user } } = await server.auth.getUser()
    if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

    const db = admin()
    const { data: profile } = await db
      .from("user_profiles").select("stripe_customer_id").eq("id", user.id).single()
    const customerId = profile?.stripe_customer_id as string | null
    if (!customerId) return Response.json({ ok: true, plan: "free", note: "kein Stripe-Kunde" })

    const stripe = getStripe()
    const state = await resolve(stripe, customerId, user.id)
    const error = await syncSubscriptionToProfile(db, state)
    if (error) return Response.json({ ok: false, error }, { status: 500 })

    const update = profileUpdateFor(state)
    return Response.json({ ok: true, plan: update.plan, matches_limit: update.matches_limit })
  } catch (error) {
    console.error("[stripe sync] error:", error)
    return Response.json({ error: "Sync fehlgeschlagen" }, { status: 500 })
  }
}

/**
 * Diagnostics (owner-only): shows exactly what's in the DB row and what Stripe
 * reports for this customer, plus what the plan resolver derives. Read-only —
 * for debugging billing drift. Open the URL while logged in.
 */
export async function GET(_req: NextRequest) {
  try {
    const server = await createServer()
    const { data: { user } } = await server.auth.getUser()
    if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

    const db = admin()
    const { data: profile } = await db
      .from("user_profiles")
      .select("plan, matches_used, matches_limit, active_jobs_limit, billing_interval, billing_period_end, stripe_customer_id, stripe_subscription_id")
      .eq("id", user.id)
      .single()

    const customerId = profile?.stripe_customer_id as string | null
    let subscriptions: unknown[] = []
    let resolved: Record<string, unknown> | null = null

    if (customerId) {
      const stripe = getStripe()
      const list = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 })
      subscriptions = list.data.map((s) => ({
        id: s.id,
        status: s.status,
        lookup_key: subLookupKey(s),
        unit_amount: s.items?.data?.[0]?.price?.unit_amount ?? null,
        current_period_end: periodEndOf(s),
      }))
      const state = await resolve(stripe, customerId, user.id)
      resolved = { state, wouldWrite: profileUpdateFor(state) }
    }

    return Response.json({ db: profile, subscriptions, resolved })
  } catch (error) {
    console.error("[stripe sync diag] error:", error)
    return Response.json({ error: "Diagnose fehlgeschlagen", detail: String(error) }, { status: 500 })
  }
}
