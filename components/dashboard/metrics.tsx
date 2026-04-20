import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Briefcase, Users, Zap, TrendingUp } from "lucide-react"

const metrics = [
  {
    title: "Aktive Jobs",
    value: "12",
    description: "3 neu diese Woche",
    icon: Briefcase,
    trend: "+2",
    trendUp: true,
  },
  {
    title: "Kandidaten gesamt",
    value: "847",
    description: "142 diese Monat",
    icon: Users,
    trend: "+18%",
    trendUp: true,
  },
  {
    title: "Matches diesen Monat",
    value: "47",
    description: "von 100 verfügbar",
    icon: Zap,
    trend: "47%",
    trendUp: true,
  },
  {
    title: "Ø Match Score",
    value: "78%",
    description: "Top-Kandidaten",
    icon: TrendingUp,
    trend: "+5%",
    trendUp: true,
  },
]

export function DashboardMetrics() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.title} className="bg-white border-slate-200 rounded-xl shadow-sm card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              {metric.title}
            </CardTitle>
            <div className="h-10 w-10 rounded-xl bg-teal-50 flex items-center justify-center">
              <metric.icon className="h-5 w-5 text-teal-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{metric.value}</div>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  metric.trendUp ? "bg-teal-50 text-teal-600" : "bg-red-50 text-red-600"
                }`}
              >
                {metric.trend}
              </span>
              <span className="text-xs text-slate-500">{metric.description}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
