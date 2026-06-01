import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Briefcase, Users, Zap, TrendingUp } from "lucide-react"

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
      title: "Aktive Jobs",
      value: String(data.activeJobs),
      description: `${data.newJobsThisWeek} neu diese Woche`,
      icon: Briefcase,
      trend: data.newJobsThisWeek > 0 ? `+${data.newJobsThisWeek}` : null,
      trendUp: true,
    },
    {
      title: "Kandidaten gesamt",
      value: String(data.totalCandidates),
      description: `${data.newCandidatesThisMonth} diesen Monat`,
      icon: Users,
      trend: data.newCandidatesThisMonth > 0 ? `+${data.newCandidatesThisMonth}` : null,
      trendUp: true,
    },
    {
      title: "Matches diesen Monat",
      value: String(data.matchesUsed),
      description: `von ${data.matchesLimit} verfügbar`,
      icon: Zap,
      trend: `${matchesPercentage}%`,
      trendUp: true,
    },
    {
      title: "Ø Match Score",
      value: `${data.avgMatchScore}%`,
      description: "Top-Kandidaten",
      icon: TrendingUp,
      trend: null,
      trendUp: true,
    },
  ]

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <Card 
          key={metric.title} 
          className="bg-white border-slate-200 rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              {metric.title}
            </CardTitle>
            <div className="h-10 w-10 rounded-xl bg-teal-50 flex items-center justify-center transition-transform duration-300 hover:scale-110 hover:rotate-3">
              <metric.icon className="h-5 w-5 text-teal-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {metric.value}
            </div>
            <div className="flex items-center gap-2 mt-2">
              {metric.trend && (
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-all duration-300 hover:scale-105 ${
                    metric.trendUp ? "bg-teal-50 text-teal-600" : "bg-red-50 text-red-600"
                  }`}
                >
                  {metric.trend}
                </span>
              )}
              <span className="text-xs text-slate-500">{metric.description}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
