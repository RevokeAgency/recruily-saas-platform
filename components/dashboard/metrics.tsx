"use client"

import { Briefcase, Users, CheckCircle2 } from "lucide-react"

import { StatCard } from "@/components/dashboard/stat-card"

export interface DashboardMetricsData {
  activeJobs: number
  newJobsThisWeek: number
  totalCandidates: number
  newCandidatesThisMonth: number
  matchesUsed: number
  matchesLimit: number
  activeJobsLimit: number
  avgMatchScore: number
  scoredCount: number
}

// Three big-number KPI tiles. The Ø Match-Score and the quota get their own
// dedicated cards below, so this row carries the three counting metrics.
export function DashboardMetrics({ data }: { data: DashboardMetricsData }) {
  const metrics = [
    {
      label: "Aktive Jobs",
      value: data.activeJobs,
      icon: Briefcase,
      tone: "green" as const,
      context:
        data.activeJobsLimit >= 999
          ? "unbegrenzte Job-Slots"
          : `${data.activeJobs} von ${data.activeJobsLimit} Slots belegt`,
    },
    {
      label: "Kandidaten gesamt",
      value: data.totalCandidates,
      icon: Users,
      tone: "cyan" as const,
      context:
        data.newCandidatesThisMonth > 0
          ? `+${data.newCandidatesThisMonth} diesen Monat`
          : "keine neuen diesen Monat",
      positive: data.newCandidatesThisMonth > 0,
    },
    {
      label: "Bewertete Matches",
      value: data.scoredCount,
      icon: CheckCircle2,
      tone: "green" as const,
      context:
        data.scoredCount > 0
          ? `Ø ${data.avgMatchScore}% Match-Score`
          : "noch keine Bewertungen",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {metrics.map((metric, i) => (
        <StatCard key={metric.label} {...metric} className={`reveal s${i + 1}`} />
      ))}
    </div>
  )
}
