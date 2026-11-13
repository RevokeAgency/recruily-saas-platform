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
export default async function AdminPage() {
  const access = await getAdminAccess()
  if (access.state === "anon") return <AdminLogin step="credentials" adminEmail={ADMIN_EMAIL} />
  if (access.state === "forbidden") return <AdminLogin step="forbidden" adminEmail={ADMIN_EMAIL} signedInAs={access.email} />
  if (access.state === "enroll" || access.state === "verify") return <AdminLogin step={access.state} adminEmail={ADMIN_EMAIL} />

  const db = await loadDbMetrics()
  const stripe = await loadStripeMetrics(db?.excludedStripeCustomers ?? [])
  return <AdminDashboard db={db} stripe={stripe} email={access.user.email ?? ADMIN_EMAIL} />
}
