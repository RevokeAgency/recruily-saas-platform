"use client"

import { Briefcase, Users, Zap } from "lucide-react"

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
}

// Ø Match-Score is the hero's flagship metric; the KPI row carries the three
// counting metrics. Staggered via `.reveal .s1–.s3` (page-level RevealGroup).
export function DashboardMetrics({ data }: { data: DashboardMetricsData }) {
  const matchesPercentage = data.matchesLimit > 0
    ? Math.round((data.matchesUsed / data.matchesLimit) * 100)
    : 0

  const metrics = [
    {
      label: "Aktive Jobs",
      value: data.activeJobs,
      icon: Briefcase,
      context: data.activeJobsLimit >= 999
        ? "unbegrenzte Job-Slots"
        : `${data.activeJobs} von ${data.activeJobsLimit} Slots belegt`,
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
      context: `${matchesPercentage}% von ${data.matchesLimit} verbraucht`,
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
