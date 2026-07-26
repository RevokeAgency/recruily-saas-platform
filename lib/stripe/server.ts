import Stripe from "stripe"

import { PLANS, type PlanId } from "@/lib/plans"

/**
 * Stripe server helpers. The product catalog is bootstrapped lazily and
 * idempotently via price lookup_keys — the first checkout on a fresh Stripe
 * account (test or live) creates the products/prices automatically, so no
 * manual dashboard setup and no seeding script is required.
 */

export type PaidPlanId = "starter" | "growth" | "pro"
export type BillingInterval = "monthly" | "yearly"

export const PAID_PLANS: PaidPlanId[] = ["starter", "growth", "pro"]

/** Higher = better; used to pick the effective plan when a customer somehow
 * ends up with more than one active subscription. */
export const PLAN_RANK: Record<PaidPlanId, number> = { starter: 1, growth: 2, pro: 3 }

const ACTIVE_SUB_STATUSES = new Set(["active", "trialing", "past_due"])

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set")
  return new Stripe(key)
}

export function lookupKeyFor(plan: PaidPlanId, interval: BillingInterval): string {
  return `revetly_${plan}_${interval}`
}

export function subLookupKey(sub: Stripe.Subscription): string | null {
  return sub.items?.data?.[0]?.price?.lookup_key ?? null
}

export function subPriceId(sub: Stripe.Subscription): string | null {
  return sub.items?.data?.[0]?.price?.id ?? null
}

export function subItemId(sub: Stripe.Subscription): string | null {
  return sub.items?.data?.[0]?.id ?? null
}

// current_period_end lives on the subscription in older API versions and on the
// subscription item in newer ones — accept both.
export function subCurrentPeriodEnd(sub: Stripe.Subscription): number | null {
  const direct = (sub as unknown as { current_period_end?: number }).current_period_end
  if (typeof direct === "number") return direct
  const item = sub.items?.data?.[0] as unknown as { current_period_end?: number } | undefined
  return typeof item?.current_period_end === "number" ? item.current_period_end : null
}

/** Orders plans for up-/downgrade decisions; yearly ranks just above monthly of
 * the same tier so an interval switch resolves deterministically too. */
export function effectiveRank(plan: PaidPlanId, interval: BillingInterval): number {
  return PLAN_RANK[plan] * 10 + (interval === "yearly" ? 1 : 0)
}

/**
 * Belt-and-suspenders "one subscription per customer": cancels every *other*
 * active subscription, keeping `keepId`. A no-op when there are no extras.
 * Returns the number cancelled.
 */
export async function cancelExtraSubscriptions(
  stripe: Stripe,
  customerId: string,
  keepId: string | null,
): Promise<number> {
  const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 })
  let cancelled = 0
  for (const s of subs.data) {
    if (s.id === keepId) continue
    if (!ACTIVE_SUB_STATUSES.has(s.status)) continue
    try {
      await stripe.subscriptions.cancel(s.id)
      cancelled++
    } catch (err) {
      console.error("[stripe] failed to cancel duplicate subscription", s.id, err)
    }
  }
  return cancelled
}

export interface PendingChange {
  plan: PaidPlanId
  interval: BillingInterval
  at: number | null
}

/**
 * If the subscription has a schedule with a future phase whose price differs
 * from the current one (a queued downgrade), returns what it switches to and
 * when. Otherwise null.
 */
export async function pendingChangeOf(
  stripe: Stripe,
  sub: Stripe.Subscription,
): Promise<PendingChange | null> {
  const scheduleId = typeof sub.schedule === "string" ? sub.schedule : sub.schedule?.id
  if (!scheduleId) return null
  const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId)
  const currentLookup = subLookupKey(sub)
  for (const phase of schedule.phases) {
    const priceRef = phase.items?.[0]?.price
    const priceId = typeof priceRef === "string" ? priceRef : priceRef?.id
    if (!priceId) continue
    const price = await stripe.prices.retrieve(priceId)
    if (price.lookup_key && price.lookup_key !== currentLookup) {
      const mapped = planFromLookupKey(price.lookup_key)
      if (mapped) return { plan: mapped.plan, interval: mapped.interval, at: phase.start_date }
    }
  }
  return null
}

/**
 * The customer's *effective* subscription = the highest-ranked plan among all
 * currently-active subscriptions (active/trialing/past_due). Returns null when
 * none are active. This is the source of truth the webhook and checkout use, so
 * duplicate or partially-cancelled subscriptions always resolve deterministically
 * to the plan the customer is actually entitled to.
 */
export async function bestActiveSubscription(
  stripe: Stripe,
  customerId: string,
): Promise<Stripe.Subscription | null> {
  const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 })
  let best: Stripe.Subscription | null = null
  let bestRank = -1
  for (const s of subs.data) {
    if (!ACTIVE_SUB_STATUSES.has(s.status)) continue
    const mapped = planFromLookupKey(subLookupKey(s))
    if (!mapped) continue
    const rank = PLAN_RANK[mapped.plan]
    if (rank > bestRank) { bestRank = rank; best = s }
  }
  return best
}

/** Reverse of lookupKeyFor — used by the webhook to map a price to a plan. */
export function planFromLookupKey(
  lookupKey: string | null | undefined,
): { plan: PaidPlanId; interval: BillingInterval } | null {
  if (!lookupKey) return null
  const m = /^revetly_(starter|growth|pro)_(monthly|yearly)$/.exec(lookupKey)
  if (!m) return null
  return { plan: m[1] as PaidPlanId, interval: m[2] as BillingInterval }
}

/**
 * Returns the price id for a plan/interval, creating product + price on the
 * fly when missing. Idempotent: prices are addressed by unique lookup_key,
 * products carry metadata.revetly_plan and are reused across intervals.
 */
export async function ensurePrice(
  stripe: Stripe,
  plan: PaidPlanId,
  interval: BillingInterval,
): Promise<string> {
  const lookupKey = lookupKeyFor(plan, interval)

  const existing = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 })
  if (existing.data[0]) return existing.data[0].id

  // Find or create the product for this plan.
  const products = await stripe.products.list({ active: true, limit: 100 })
  let product = products.data.find((p) => p.metadata?.revetly_plan === plan)
  if (!product) {
    product = await stripe.products.create({
      name: `Revetly ${PLANS[plan].label}`,
      description: `${PLANS[plan].matches_label} · ${
        PLANS[plan].active_jobs === 999 ? "Unbegrenzte aktive Jobs" : `${PLANS[plan].active_jobs} aktive Jobs`
      }`,
      metadata: { revetly_plan: plan },
    })
  }

  const amount = interval === "yearly" ? PLANS[plan].price_yearly : PLANS[plan].price_monthly
  const price = await stripe.prices.create({
    product: product.id,
    currency: "eur",
    unit_amount: amount * 100,
    recurring: { interval: interval === "yearly" ? "year" : "month" },
    lookup_key: lookupKey,
    // If a deactivated price still holds the key, take it over instead of failing.
    transfer_lookup_key: true,
    metadata: { revetly_plan: plan, revetly_interval: interval },
  })
  return price.id
}

/** All six paid price ids (creating any that are missing). */
export async function ensureAllPrices(stripe: Stripe): Promise<string[]> {
  const ids: string[] = []
  for (const plan of PAID_PLANS) {
    for (const interval of ["monthly", "yearly"] as const) {
      ids.push(await ensurePrice(stripe, plan, interval))
    }
  }
  return ids
}

/**
 * Customer-portal configuration (idempotent, tagged via metadata). Lets
 * customers update payment methods, view invoices, switch between the six
 * Revetly prices (proration handled by Stripe) and cancel at period end.
 */
export async function ensurePortalConfiguration(stripe: Stripe): Promise<string> {
  const configs = await stripe.billingPortal.configurations.list({ limit: 100 })
  const mine = configs.data.find((c) => c.metadata?.revetly === "default" && c.active)
  if (mine) return mine.id

  const priceIds = await ensureAllPrices(stripe)
  const prices = await Promise.all(priceIds.map((id) => stripe.prices.retrieve(id)))
  const byProduct = new Map<string, string[]>()
  for (const p of prices) {
    const productId = typeof p.product === "string" ? p.product : p.product.id
    byProduct.set(productId, [...(byProduct.get(productId) ?? []), p.id])
  }

  const config = await stripe.billingPortal.configurations.create({
    business_profile: { headline: "Revetly — Abo verwalten" },
    features: {
      customer_update: { enabled: true, allowed_updates: ["email", "address", "tax_id"] },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: true, mode: "at_period_end" },
      subscription_update: {
        enabled: true,
        default_allowed_updates: ["price"],
        proration_behavior: "create_prorations",
        products: [...byProduct.entries()].map(([product, pids]) => ({ product, prices: pids })),
      },
    },
    metadata: { revetly: "default" },
  })
  return config.id
}
