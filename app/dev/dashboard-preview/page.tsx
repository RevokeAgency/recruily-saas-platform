import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { AppTopbar } from "@/components/app-topbar"
import { DashboardView } from "@/components/dashboard/dashboard-view"
import { PREVIEW_DASHBOARD, PREVIEW_USER } from "@/lib/dev/dashboard-mock"

// ─────────────────────────────────────────────────────────────────────────────
// Entwicklungsvorschau des Dashboards mit Beispieldaten, ohne Anmeldung und
// ohne Datenbank. Gedacht für Aufnahmen (Remotion) und für die Arbeit an der
// Oberfläche.
//
// Nur lokal: In Produktion antwortet die Seite mit 404, außer
// ENABLE_DEV_PREVIEW=true ist gesetzt (etwa für eine Vorschau-Umgebung).
// Sie zeigt ausschließlich erfundene Daten aus lib/dev/dashboard-mock.ts.
// ─────────────────────────────────────────────────────────────────────────────

// Zur Laufzeit prüfen, nicht beim Build: Sonst wäre die Freigabe über
// ENABLE_DEV_PREVIEW an den Zeitpunkt des Builds gebunden.
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Dashboard-Vorschau | Revetly",
  robots: { index: false, follow: false },
}

export default function DashboardPreviewPage() {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_DEV_PREVIEW !== "true") notFound()

  // Dieselbe Hülle wie app/(app)/layout.tsx, damit die Aufnahme genau wie die
  // App aussieht.
  return (
    <div className="h-screen overflow-hidden bg-[var(--app-backdrop)] p-2 sm:p-3">
      <div className="flex h-full flex-col overflow-hidden rounded-[28px] [background:var(--app-canvas)] shadow-[0_40px_90px_-40px_rgba(15,23,32,.5)]">
        <AppTopbar preview={{ user: PREVIEW_USER, pathname: "/dashboard" }} />
        <main className="min-h-0 flex-1 overflow-auto">
          <div className="relative min-h-full">
            <DashboardView data={PREVIEW_DASHBOARD} />
          </div>
        </main>
      </div>
    </div>
  )
}
