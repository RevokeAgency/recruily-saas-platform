import type { Metadata } from "next"

import { AdminDashboard } from "@/components/admin/admin-dashboard"
import { AdminLogin } from "@/components/admin/admin-login"
import { ADMIN_EMAIL, getAdminAccess } from "@/lib/admin/access"
import { loadDbMetrics } from "@/lib/admin/metrics"
import { loadStripeMetrics } from "@/lib/admin/stripe-metrics"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export const metadata: Metadata = {
  title: { absolute: "Admin | Revetly" },
  robots: { index: false, follow: false },
}

// Admin-Bereich: Login mit Passwort und zweitem Faktor, danach die Übersicht.
// Zugang nur für admin@revetly.ai (lib/admin/access.ts). Zahlen werden erst
// geladen, wenn die Anmeldung vollständig ist.
async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      console.error(`[admin] ${label}: keine Antwort nach ${ms} ms`)
      resolve(null)
    }, ms)
  })
  try {
    return await Promise.race([p, timeout])
  } catch (err) {
    console.error(`[admin] ${label} fehlgeschlagen:`, err)
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Zahlen für die Übersicht. Jede Quelle hat eine Zeitgrenze: Hängt die
 * Datenbank oder Stripe, zeigt die Seite an, was da ist, statt bis zum
 * Abbruch zu laden. Die Dauer steht im Log.
 */
async function loadOverview() {
  const t0 = Date.now()
  const db = await withTimeout(loadDbMetrics(), 25_000, "Datenbank")
  const t1 = Date.now()
  const stripe = await withTimeout(loadStripeMetrics(db?.excludedStripeCustomers ?? []), 20_000, "Stripe")
  console.info(`[admin] Übersicht geladen: Datenbank ${t1 - t0} ms, Stripe ${Date.now() - t1} ms`)
  // Ohne Antwort von Stripe eine Fehlermeldung statt „nicht eingerichtet“.
  return { db, stripe: stripe ?? (process.env.STRIPE_SECRET_KEY ? { error: "Keine Antwort innerhalb der Zeitgrenze" } : null) }
}

export default async function AdminPage() {
  const access = await getAdminAccess()
  if (access.state === "anon") return <AdminLogin step="credentials" adminEmail={ADMIN_EMAIL} />
  if (access.state === "forbidden") return <AdminLogin step="forbidden" adminEmail={ADMIN_EMAIL} signedInAs={access.email} />
  if (access.state === "enroll" || access.state === "verify") return <AdminLogin step={access.state} adminEmail={ADMIN_EMAIL} />

  const { db, stripe } = await loadOverview()
  return <AdminDashboard db={db} stripe={stripe} email={access.user.email ?? ADMIN_EMAIL} />
}
