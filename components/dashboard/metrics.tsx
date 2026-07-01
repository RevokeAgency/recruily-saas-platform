import { Briefcase, Users, Zap, TrendingUp } from "lucide-react"

import { StatCard } from "@/components/dashboard/stat-card"

export interface DashboardMetricsData {
  activeJobs: number
  newJobsThisWeek: number
  totalCandidates: number
  newCandidatesThisMonth: number
  matchesUsed: number
  matchesLimit: number
  avgMatchScore: number
}

export function DashboardMetrics({ data }: { data: DashboardMetricsData }) {
  const matchesPercentage = data.matchesLimit > 0
    ? Math.round((data.matchesUsed / data.matchesLimit) * 100)
    : 0

  const metrics = [
    {
      label: "Aktive Jobs",
      value: data.activeJobs,
      icon: Briefcase,
      context: data.newJobsThisWeek > 0 ? `+${data.newJobsThisWeek} diese Woche` : "keine neuen diese Woche",
      positive: data.newJobsThisWeek > 0,
    },
    {
      label: "Kandidaten gesamt",
      value: data.totalCandidates,
      icon: Users,
      context: data.newCandidatesThisMonth > 0 ? `+${data.newCandidatesThisMonth} diesen Monat` : "keine neuen diesen Monat",
      positive: data.newCandidatesThisMonth > 0,
    },
    {
      label: "Matches diesen Monat",
      value: data.matchesUsed,
      icon: Zap,
      context: `${matchesPercentage}% von ${data.matchesLimit} verfügbar`,
    },
    {
      label: "Ø Match Score",
      value: `${data.avgMatchScore}%`,
      icon: TrendingUp,
      context: "Top-Kandidaten",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <StatCard key={metric.label} {...metric} />
      ))}
    </div>
  )
}
