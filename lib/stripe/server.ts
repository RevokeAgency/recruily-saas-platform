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

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set")
  return new Stripe(key)
}

export function lookupKeyFor(plan: PaidPlanId, interval: BillingInterval): string {
  return `revetly_${plan}_${interval}`
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
