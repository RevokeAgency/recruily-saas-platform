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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.title} className="border border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {metric.title}
            </CardTitle>
            <metric.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{metric.value}</div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-xs font-medium ${
                  metric.trendUp ? "text-success" : "text-destructive"
                }`}
              >
                {metric.trend}
              </span>
              <span className="text-xs text-muted-foreground">{metric.description}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
