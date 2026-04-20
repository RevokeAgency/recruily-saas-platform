import { DashboardMetrics } from "@/components/dashboard/metrics"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { QuotaProgress } from "@/components/dashboard/quota-progress"

export default function DashboardPage() {
  return (
    <div className="p-8 lg:p-10 space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-slate-500 mt-1.5">
          Willkommen zurück! Hier ist deine Recruiting-Übersicht.
        </p>
      </div>

      {/* Metrics Grid */}
      <DashboardMetrics />

      {/* Quota Progress */}
      <QuotaProgress />

      {/* Quick Actions */}
      <QuickActions />

      {/* Recent Activity */}
      <RecentActivity />
    </div>
  )
}
