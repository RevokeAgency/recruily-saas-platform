"use client"

/**
 * Browser-side helpers: call our Stripe routes and follow the returned URL.
 * Both resolve to an error message (string) on failure, or never return on
 * success (the browser navigates away).
 */

export async function startCheckout(
  plan: "starter" | "growth" | "pro",
  interval: "monthly" | "yearly",
): Promise<string | null> {
  try {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, interval }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.url) return data.error || "Checkout konnte nicht gestartet werden"
    window.location.assign(data.url)
    return null
  } catch {
    return "Checkout konnte nicht gestartet werden"
  }
}

export async function openBillingPortal(): Promise<string | null> {
  try {
    const res = await fetch("/api/stripe/portal", { method: "POST" })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.url) return data.error || "Portal konnte nicht geöffnet werden"
    window.location.assign(data.url)
    return null
  } catch {
    return "Portal konnte nicht geöffnet werden"
  }
}

const INTENT_KEY = "revetly:checkout-intent"

export function storeCheckoutIntent(plan: string, interval: string): void {
  try {
    if (["starter", "growth", "pro"].includes(plan)) {
      localStorage.setItem(INTENT_KEY, JSON.stringify({ plan, interval: interval === "yearly" ? "yearly" : "monthly" }))
    }
  } catch { /* storage unavailable */ }
}

export function consumeCheckoutIntent(): { plan: "starter" | "growth" | "pro"; interval: "monthly" | "yearly" } | null {
  try {
    const raw = localStorage.getItem(INTENT_KEY)
    if (!raw) return null
    localStorage.removeItem(INTENT_KEY)
    const parsed = JSON.parse(raw)
    if (!["starter", "growth", "pro"].includes(parsed.plan)) return null
    return { plan: parsed.plan, interval: parsed.interval === "yearly" ? "yearly" : "monthly" }
  } catch {
    return null
  }
}

export function hasCheckoutIntent(): boolean {
  try {
    return localStorage.getItem(INTENT_KEY) !== null
  } catch {
    return false
  }
}
