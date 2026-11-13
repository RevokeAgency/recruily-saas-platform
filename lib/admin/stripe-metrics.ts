import type Stripe from "stripe"

import { getStripe } from "@/lib/stripe/server"

// ─────────────────────────────────────────────────────────────────────────────
// Umsatz, MRR und Churn direkt aus Stripe.
//
// MRR: alle laufenden Abos (active, trialing, past_due), jede Position mit
// Preis mal Menge, auf einen Monat umgerechnet (Jahrespreis / 12), abzüglich
// hinterlegter Gutscheine. Netto, ohne Umsatzsteuer.
// Umsatz: bezahlte Rechnungen nach Monat, netto (total_excluding_tax).
// Churn: Kunden, deren letztes Abo in den letzten 30 Tagen geendet hat, geteilt
// durch die Kunden mit laufendem Abo zu Beginn dieses Zeitraums.
// Konten aus ADMIN_EXCLUDE_EMAILS und @revetly.ai fehlen in allen Zahlen.
// ─────────────────────────────────────────────────────────────────────────────

const DAY = 86_400_000
const RUNNING = new Set(["active", "trialing", "past_due"])

export interface CouponLike {
  percent_off?: number | null
  amount_off?: number | null
  duration?: string | null
  duration_in_months?: number | null
}

export interface SubLike {
  id: string
  customer: string
  status: string
  created: number
  ended_at: number | null
  cancel_at_period_end: boolean
  items: { amount: number; quantity: number; interval: "day" | "week" | "month" | "year"; intervalCount: number }[]
  coupons: CouponLike[]
}

export interface InvoiceLike {
  customer: string | null
  currency: string
  created: number
  paidAt: number | null
  net: number
}

/** Betrag einer Position in Cent pro Monat. */
export function monthlyAmount(item: SubLike["items"][number]): number {
  const total = item.amount * item.quantity
  const perUnit = { day: 365 / 12, week: 52 / 12, month: 1, year: 1 / 12 }[item.interval]
  return (total * perUnit) / Math.max(item.intervalCount, 1)
}

export function subscriptionMrr(sub: SubLike): number {
  let mrr = sub.items.reduce((s, i) => s + monthlyAmount(i), 0)
  for (const c of sub.coupons) {
    if (c.percent_off) mrr *= 1 - c.percent_off / 100
    else if (c.amount_off) mrr = Math.max(0, mrr - c.amount_off)
  }
  return Math.round(mrr)
}

export interface SubscriptionMetrics {
  mrr: number
  arr: number
  payingCustomers: number
  trialing: number
  pastDue: number
  cancelScheduled: number
  newMrr30: number
  churnedMrr30: number
  churnedCustomers30: number
  /** null, wenn es zu Beginn des Zeitraums keine zahlenden Kunden gab. */
  churnRate30: number | null
  arpa: number | null
}

export function computeSubscriptionMetrics(subs: SubLike[], now: Date, excludedCustomers: Set<string>): SubscriptionMetrics {
  const list = subs.filter((s) => !excludedCustomers.has(s.customer))
  const since = Math.floor((now.getTime() - 30 * DAY) / 1000)
  const running = list.filter((s) => RUNNING.has(s.status))
  const mrr = running.reduce((sum, s) => sum + subscriptionMrr(s), 0)
  const payingNow = new Set(running.filter((s) => s.status !== "trialing").map((s) => s.customer))

  const ended = list.filter((s) => s.ended_at && s.ended_at >= since)
  // Ein Kunde gilt erst als verloren, wenn er heute kein laufendes Abo mehr hat
  // (ein Planwechsel beendet das alte Abo, der Kunde bleibt).
  const runningCustomers = new Set(running.map((s) => s.customer))
  const churnedCustomers = new Set(ended.filter((s) => !runningCustomers.has(s.customer)).map((s) => s.customer))
  const churnedMrr = ended.filter((s) => churnedCustomers.has(s.customer)).reduce((sum, s) => sum + subscriptionMrr(s), 0)

  // Kunden mit laufendem Abo zu Beginn des Zeitraums: angelegt davor und
  // damals noch nicht beendet.
  const atStart = new Set(
    list.filter((s) => s.created < since && (!s.ended_at || s.ended_at >= since) && s.status !== "incomplete" && s.status !== "incomplete_expired").map((s) => s.customer),
  )
  const newSubs = running.filter((s) => s.created >= since && !atStart.has(s.customer))

  return {
    mrr,
    arr: mrr * 12,
    payingCustomers: payingNow.size,
    trialing: running.filter((s) => s.status === "trialing").length,
    pastDue: running.filter((s) => s.status === "past_due").length,
    cancelScheduled: running.filter((s) => s.cancel_at_period_end).length,
    newMrr30: newSubs.reduce((sum, s) => sum + subscriptionMrr(s), 0),
    churnedMrr30: churnedMrr,
    churnedCustomers30: churnedCustomers.size,
    churnRate30: atStart.size ? churnedCustomers.size / atStart.size : null,
    arpa: payingNow.size ? Math.round(mrr / payingNow.size) : null,
  }
}

/** Netto-Umsatz je Monat (EUR) für die letzten `months` Monate, ältester zuerst. */
export function revenueByMonth(invoices: InvoiceLike[], now: Date, excludedCustomers: Set<string>, months = 6) {
  const keys = Array.from({ length: months }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1 - i), 1))
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
  })
  const sums = new Map(keys.map((k) => [k, 0]))
  for (const inv of invoices) {
    if (inv.currency !== "eur" || (inv.customer && excludedCustomers.has(inv.customer))) continue
    const d = new Date((inv.paidAt ?? inv.created) * 1000)
    const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
    if (sums.has(k)) sums.set(k, sums.get(k)! + inv.net)
  }
  return keys.map((k) => {
    const [y, m] = k.split("-").map(Number)
    return {
      month: new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("de-AT", { month: "short", year: "2-digit", timeZone: "UTC" }),
      amount: sums.get(k)!,
    }
  })
}

export interface StripeMetrics extends SubscriptionMetrics {
  mode: "live" | "test"
  revenueThisMonth: number
  revenue30: number
  revenueByMonth: { month: string; amount: number }[]
}

function idOf(x: string | { id: string } | null | undefined): string {
  return typeof x === "string" ? x : (x?.id ?? "")
}

async function toSubLike(stripe: Stripe, s: Stripe.Subscription, coupons: Map<string, CouponLike>): Promise<SubLike> {
  const subCoupons: CouponLike[] = []
  for (const d of s.discounts ?? []) {
    if (typeof d === "string") continue
    const ref = (d as unknown as { source?: { coupon?: string | Stripe.Coupon }; coupon?: string | Stripe.Coupon }).source?.coupon
      ?? (d as unknown as { coupon?: string | Stripe.Coupon }).coupon
    if (!ref) continue
    if (typeof ref !== "string") {
      subCoupons.push(ref)
      continue
    }
    if (!coupons.has(ref)) coupons.set(ref, await stripe.coupons.retrieve(ref).catch(() => ({}) as CouponLike))
    subCoupons.push(coupons.get(ref)!)
  }
  return {
    id: s.id,
    customer: idOf(s.customer as string | { id: string }),
    status: s.status,
    created: s.created,
    ended_at: s.ended_at,
    cancel_at_period_end: s.cancel_at_period_end,
    items: s.items.data.map((i) => ({
      amount: i.price.unit_amount ?? 0,
      quantity: i.quantity ?? 1,
      interval: i.price.recurring?.interval ?? "month",
      intervalCount: i.price.recurring?.interval_count ?? 1,
    })),
    coupons: subCoupons,
  }
}

export async function loadStripeMetrics(excludedCustomers: string[], now = new Date()): Promise<StripeMetrics | { error: string } | null> {
  if (!process.env.STRIPE_SECRET_KEY) return null
  try {
    const stripe = getStripe()
    const mode = process.env.STRIPE_SECRET_KEY.startsWith("sk_live") ? "live" : "test"
    const excluded = new Set(excludedCustomers)

    const coupons = new Map<string, CouponLike>()
    const subs: SubLike[] = []
    for await (const s of stripe.subscriptions.list({ status: "all", limit: 100, expand: ["data.discounts"] })) {
      subs.push(await toSubLike(stripe, s, coupons))
      if (subs.length >= 5000) break
    }

    const from = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1) / 1000)
    const invoices: InvoiceLike[] = []
    for await (const inv of stripe.invoices.list({ status: "paid", limit: 100, created: { gte: from } })) {
      invoices.push({
        customer: idOf(inv.customer as string | { id: string } | null) || null,
        currency: inv.currency,
        created: inv.created,
        paidAt: inv.status_transitions?.paid_at ?? null,
        net: inv.total_excluding_tax ?? inv.amount_paid,
      })
      if (invoices.length >= 10000) break
    }

    const byMonth = revenueByMonth(invoices, now, excluded)
    const since30 = now.getTime() / 1000 - 30 * 86400
    const revenue30 = invoices
      .filter((i) => i.currency === "eur" && !(i.customer && excluded.has(i.customer)) && (i.paidAt ?? i.created) >= since30)
      .reduce((s, i) => s + i.net, 0)

    return {
      mode,
      ...computeSubscriptionMetrics(subs, now, excluded),
      revenueThisMonth: byMonth.at(-1)?.amount ?? 0,
      revenue30,
      revenueByMonth: byMonth,
    }
  } catch (err) {
    console.error("[admin] Stripe-Zahlen übersprungen:", err)
    return { error: err instanceof Error ? err.message : String(err) }
  }
}
