import { DashboardHero, type PipelineBreakdown } from "@/components/dashboard/dashboard-hero"
import { type DashboardMetricsData } from "@/components/dashboard/metrics"
import { RecentActivity, type RecentJob } from "@/components/dashboard/recent-activity"
import { QuotaProgress } from "@/components/dashboard/quota-progress"
import { ScoreGauge } from "@/components/dashboard/score-gauge"
import { Priorities, type PriorityItem } from "@/components/dashboard/priorities"
import { RecentApplications, type RecentApplication } from "@/components/dashboard/recent-applications"
import { TopCandidates, type TopCandidate } from "@/components/dashboard/top-candidates"
import { KpiPanel, type KpiData } from "@/components/dashboard/kpi-panel"
import { MatchQuality, type QualityReport } from "@/components/dashboard/match-quality"
import { RevealGroup } from "@/components/app/reveal-group"

export interface DashboardViewData {
  firstName: string | null
  metrics: DashboardMetricsData
  pipeline: PipelineBreakdown
  quotaPeriod: "lifetime" | "monthly"
  priorities: PriorityItem[]
  recentApplications: RecentApplication[]
  topCandidates: TopCandidate[]
  kpis: KpiData
  kpisLocked: boolean
  recentJobs: RecentJob[]
  /** Nur für die Vorschau: fester Bericht statt Abruf von /api/matching/quality. */
  qualityReport?: QualityReport
}

/**
 * Das Dashboard ohne Datenquelle. Die echte Seite (app/(app)/dashboard) lädt
 * die Zahlen aus der Datenbank, die Entwicklungsvorschau
 * (app/dev/dashboard-preview) aus Beispieldaten. Beide rendern hierüber,
 * damit die Vorschau genau so aussieht wie die App.
 */
export function DashboardView({ data }: { data: DashboardViewData }) {
  const { metrics } = data
  return (
    <RevealGroup className="relative z-[1] space-y-6 p-6 lg:p-8">
      {/* Greeting + bare big numbers + pipeline meter (reference hero) */}
      <DashboardHero
        firstName={data.firstName}
        activeJobs={metrics.activeJobs}
        totalCandidates={metrics.totalCandidates}
        scoredCount={metrics.scoredCount}
        pipeline={data.pipeline}
      />

      {/* Score gauge · segmented quota · dark priorities focus card */}
      <div className="reveal grid gap-4 lg:grid-cols-3">
        <ScoreGauge score={metrics.avgMatchScore} scoredCount={metrics.scoredCount} />
        <QuotaProgress used={metrics.matchesUsed} total={metrics.matchesLimit} period={data.quotaPeriod} />
        <Priorities items={data.priorities} />
      </div>

      {/* Latest applications · strongest matches · recruiting KPIs */}
      <div className="reveal grid gap-4 lg:grid-cols-3">
        <RecentApplications items={data.recentApplications} />
        <TopCandidates items={data.topCandidates} />
        <KpiPanel data={data.kpis} locked={data.kpisLocked} />
      </div>

      {/* How well the matching predicted this tenant's own decisions.
          Renders nothing until there are enough decisions to be honest. */}
      <div className="reveal grid gap-4 lg:grid-cols-3">
        <MatchQuality report={data.qualityReport} />
      </div>

      {/* Recent activity */}
      <RecentActivity jobs={data.recentJobs} className="reveal" />
    </RevealGroup>
  )
}
