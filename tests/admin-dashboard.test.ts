import { describe, expect, it } from "vitest"
import type { User } from "@supabase/supabase-js"

import { accessFromLevels, isAdminEmail } from "@/lib/admin/access"
import { countPerWeek, excludedEmail, weekStart } from "@/lib/admin/metrics"
import {
  computeSubscriptionMetrics,
  monthlyAmount,
  revenueByMonth,
  subscriptionMrr,
  type SubLike,
} from "@/lib/admin/stripe-metrics"

const user = (email: string) => ({ id: "u", email }) as User

describe("Zugang zum Admin-Bereich", () => {
  it("nur admin@revetly.ai, Groß- und Kleinschreibung egal", () => {
    expect(isAdminEmail("admin@revetly.ai")).toBe(true)
    expect(isAdminEmail(" Admin@Revetly.ai ")).toBe(true)
    expect(isAdminEmail("hallo@revetly.ai")).toBe(false)
    expect(isAdminEmail(null)).toBe(false)
  })

  it("verlangt den zweiten Faktor", () => {
    expect(accessFromLevels(user("admin@revetly.ai"), "aal1", "aal1").state).toBe("enroll")
    expect(accessFromLevels(user("admin@revetly.ai"), "aal1", "aal2").state).toBe("verify")
    expect(accessFromLevels(user("admin@revetly.ai"), "aal2", "aal2").state).toBe("ok")
    expect(accessFromLevels(user("kunde@firma.at"), "aal2", "aal2").state).toBe("forbidden")
  })
})

describe("Interne Konten", () => {
  it("blendet @revetly.ai und die Liste aus der Variable aus", () => {
    expect(excludedEmail("admin@revetly.ai", "")).toBe(true)
    expect(excludedEmail("test@revetly.ai", "")).toBe(true)
    expect(excludedEmail("Ich+Test@Gmail.com", "ich+test@gmail.com, andere@x.at")).toBe(true)
    expect(excludedEmail("kunde@firma.at", "ich+test@gmail.com")).toBe(false)
  })
})

describe("Registrierungen je Woche", () => {
  it("zählt in Wochen ab Montag, älteste zuerst", () => {
    const now = new Date("2026-11-13T12:00:00Z") // Freitag
    expect(weekStart(now).toISOString()).toBe("2026-11-09T00:00:00.000Z")
    const weeks = countPerWeek(
      [new Date("2026-11-09T08:00:00Z"), new Date("2026-11-12T08:00:00Z"), new Date("2026-11-02T08:00:00Z"), new Date("2025-01-01")],
      now,
      3,
    )
    expect(weeks.map((w) => w.count)).toEqual([0, 1, 2])
    expect(weeks[2].week).toBe("09.11.")
  })
})

const sub = (o: Partial<SubLike>): SubLike => ({
  id: "s",
  customer: "c1",
  status: "active",
  created: Date.parse("2026-01-01") / 1000,
  ended_at: null,
  cancel_at_period_end: false,
  items: [{ amount: 9900, quantity: 1, interval: "month", intervalCount: 1 }],
  coupons: [],
  ...o,
})

describe("Stripe-Kennzahlen", () => {
  it("rechnet Jahrespreise und Mengen auf den Monat um", () => {
    expect(monthlyAmount({ amount: 249000, quantity: 1, interval: "year", intervalCount: 1 })).toBe(20750)
    expect(monthlyAmount({ amount: 1499, quantity: 3, interval: "month", intervalCount: 1 })).toBe(4497)
  })

  it("zieht Gutscheine ab", () => {
    expect(subscriptionMrr(sub({ coupons: [{ percent_off: 20 }] }))).toBe(7920)
    expect(subscriptionMrr(sub({ coupons: [{ amount_off: 1000 }] }))).toBe(8900)
  })

  it("MRR, Churn und Planwechsel", () => {
    const now = new Date("2026-11-13T12:00:00Z")
    const t = (iso: string) => Date.parse(iso) / 1000
    const metrics = computeSubscriptionMetrics(
      [
        sub({ id: "a", customer: "c1" }),
        // c2 hat gekündigt: verloren
        sub({ id: "b", customer: "c2", status: "canceled", ended_at: t("2026-11-01") }),
        // c3 hat den Plan gewechselt: altes Abo beendet, neues läuft, kein Churn
        sub({ id: "c", customer: "c3", status: "canceled", ended_at: t("2026-11-05") }),
        sub({ id: "d", customer: "c3", created: t("2026-11-05"), items: [{ amount: 24900, quantity: 1, interval: "month", intervalCount: 1 }] }),
        // c4 ist neu
        sub({ id: "e", customer: "c4", created: t("2026-11-10") }),
        // ausgeblendetes Testkonto
        sub({ id: "f", customer: "intern" }),
      ],
      now,
      new Set(["intern"]),
    )
    expect(metrics.mrr).toBe(9900 + 24900 + 9900)
    expect(metrics.payingCustomers).toBe(3)
    expect(metrics.churnedCustomers30).toBe(1)
    expect(metrics.churnedMrr30).toBe(9900)
    // Zu Beginn: c1, c2, c3 → 1 von 3 verloren
    expect(metrics.churnRate30).toBeCloseTo(1 / 3)
    expect(metrics.newMrr30).toBe(9900)
  })

  it("Umsatz je Monat nur in Euro und ohne interne Kunden", () => {
    const now = new Date("2026-11-13T12:00:00Z")
    const t = (iso: string) => Date.parse(iso) / 1000
    const months = revenueByMonth(
      [
        { customer: "c1", currency: "eur", created: t("2026-11-02"), paidAt: t("2026-11-02"), net: 9900 },
        { customer: "c1", currency: "eur", created: t("2026-10-02"), paidAt: t("2026-10-03"), net: 9900 },
        { customer: "intern", currency: "eur", created: t("2026-11-02"), paidAt: t("2026-11-02"), net: 50000 },
        { customer: "c2", currency: "usd", created: t("2026-11-02"), paidAt: t("2026-11-02"), net: 7000 },
      ],
      now,
      new Set(["intern"]),
      2,
    )
    expect(months.map((m) => m.amount)).toEqual([9900, 9900])
  })
})
