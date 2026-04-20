import { DashboardMetrics } from "@/components/dashboard/metrics"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { QuotaProgress } from "@/components/dashboard/quota-progress"

export default function DashboardPage() {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
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
