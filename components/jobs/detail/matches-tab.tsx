import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Users, TrendingUp, Award, AlertCircle } from "lucide-react"

const matchStats = {
  totalMatched: 24,
  avgScore: 78,
  above80: 8,
  above60: 12,
  below60: 4,
}

const topInsights = [
  {
    type: "strength",
    title: "Starke Skill-Übereinstimmung",
    description: "87% der Kandidaten erfüllen die React und TypeScript Anforderungen.",
  },
  {
    type: "strength",
    title: "Gute Erfahrungslevel",
    description: "67% haben mehr als 4 Jahre relevante Berufserfahrung.",
  },
  {
    type: "warning",
    title: "Gehaltserwartungen",
    description: "42% der Kandidaten haben höhere Gehaltsvorstellungen als budgetiert.",
  },
  {
    type: "info",
    title: "Standort-Flexibilität",
    description: "58% der Kandidaten sind für Remote oder Hybrid-Arbeit offen.",
  },
]

const skillDistribution = [
  { skill: "React", percentage: 92 },
  { skill: "TypeScript", percentage: 87 },
  { skill: "CSS/SCSS", percentage: 83 },
  { skill: "Git", percentage: 100 },
  { skill: "REST APIs", percentage: 79 },
  { skill: "Next.js", percentage: 54 },
  { skill: "GraphQL", percentage: 33 },
  { skill: "Testing", percentage: 46 },
]

export function JobMatchesTab() {
  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{matchStats.totalMatched}</p>
                <p className="text-sm text-muted-foreground">Kandidaten gematcht</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{matchStats.avgScore}%</p>
                <p className="text-sm text-muted-foreground">Ø Match-Score</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <Award className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{matchStats.above80}</p>
                <p className="text-sm text-muted-foreground">Top-Kandidaten (80%+)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{matchStats.below60}</p>
                <p className="text-sm text-muted-foreground">Unter 60%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* AI Insights */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              AI Insights
              <Badge variant="outline" className="text-xs">Gemini</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {topInsights.map((insight, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg ${
                  insight.type === "strength"
                    ? "bg-success/5 border border-success/20"
                    : insight.type === "warning"
                    ? "bg-warning/5 border border-warning/20"
                    : "bg-muted/50 border border-border"
                }`}
              >
                <h4 className="font-medium text-foreground text-sm">{insight.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Skill Distribution */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-lg">Skill-Verteilung der Kandidaten</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {skillDistribution.map((item) => (
              <div key={item.skill} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{item.skill}</span>
                  <span className="text-muted-foreground">{item.percentage}%</span>
                </div>
                <Progress value={item.percentage} gradient />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Score Distribution */}
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="text-lg">Score-Verteilung</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-32">
            {[
              { range: "90-100%", count: 3, color: "bg-success" },
              { range: "80-89%", count: 5, color: "bg-success/70" },
              { range: "70-79%", count: 7, color: "bg-warning" },
              { range: "60-69%", count: 5, color: "bg-warning/70" },
              { range: "50-59%", count: 3, color: "bg-destructive/70" },
              { range: "<50%", count: 1, color: "bg-destructive" },
            ].map((bucket) => (
              <div key={bucket.range} className="flex-1 flex flex-col items-center">
                <div
                  className={`w-full ${bucket.color} rounded-t`}
                  style={{ height: `${(bucket.count / 7) * 100}%`, minHeight: "8px" }}
                />
                <span className="text-xs text-muted-foreground mt-2 text-center">
                  {bucket.range}
                </span>
                <span className="text-xs font-medium text-foreground">{bucket.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
