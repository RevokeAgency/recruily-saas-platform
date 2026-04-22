"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  Target,
  Sparkles,
  Loader2,
} from "lucide-react"
import useSWR from "swr"

interface JobAnalyticsTabProps {
  jobId: string
}

interface AnalyticsData {
  totalCandidates: number
  scoredCandidates: number
  avgScore: number
  conversionRate: number
  daysSinceFirstCandidate: number
  statusCounts: {
    new: number
    analyzing: number
    scored: number
    shortlisted: number
    interviewed: number
    offered: number
    hired: number
    rejected: number
  }
  scoreDistribution: {
    excellent: number
    good: number
    fair: number
    belowAverage: number
    poor: number
  }
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function JobAnalyticsTab({ jobId }: JobAnalyticsTabProps) {
  const { data, error, isLoading } = useSWR<AnalyticsData>(
    `/api/jobs/${jobId}/analytics`,
    fetcher
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Fehler beim Laden der Analytics-Daten
      </div>
    )
  }

  // Calculate max for pipeline progress bars
  const pipelineMax = Math.max(
    data.statusCounts.new + data.statusCounts.analyzing + data.statusCounts.scored,
    data.statusCounts.shortlisted,
    data.statusCounts.interviewed,
    data.statusCounts.offered,
    data.statusCounts.hired,
    1
  )

  // Calculate max for score distribution
  const scoreMax = Math.max(
    data.scoreDistribution.excellent,
    data.scoreDistribution.good,
    data.scoreDistribution.fair,
    data.scoreDistribution.belowAverage,
    data.scoreDistribution.poor,
    1
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Analytics</h2>
        <p className="text-muted-foreground text-sm">
          Verfolge Performance-Metriken und Insights für diese Stellenanzeige
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{data.totalCandidates}</p>
                <p className="text-xs text-muted-foreground">Kandidaten</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{data.avgScore}%</p>
                <p className="text-xs text-muted-foreground">Durchschn. Score</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Target className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{data.conversionRate}%</p>
                <p className="text-xs text-muted-foreground">Conversion Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{data.daysSinceFirstCandidate}</p>
                <p className="text-xs text-muted-foreground">Tage aktiv</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Candidate Pipeline */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-teal-600" />
              Kandidaten-Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Neu / In Analyse</span>
                  <span className="text-sm font-medium">
                    {data.statusCounts.new + data.statusCounts.analyzing + data.statusCounts.scored}
                  </span>
                </div>
                <Progress 
                  value={((data.statusCounts.new + data.statusCounts.analyzing + data.statusCounts.scored) / pipelineMax) * 100} 
                  className="h-2 bg-muted [&>div]:bg-slate-400" 
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Shortlisted</span>
                  <span className="text-sm font-medium">{data.statusCounts.shortlisted}</span>
                </div>
                <Progress 
                  value={(data.statusCounts.shortlisted / pipelineMax) * 100} 
                  className="h-2 bg-muted [&>div]:bg-blue-500" 
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Interviewed</span>
                  <span className="text-sm font-medium">{data.statusCounts.interviewed}</span>
                </div>
                <Progress 
                  value={(data.statusCounts.interviewed / pipelineMax) * 100} 
                  className="h-2 bg-muted [&>div]:bg-amber-500" 
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Angebot gemacht</span>
                  <span className="text-sm font-medium">{data.statusCounts.offered}</span>
                </div>
                <Progress 
                  value={(data.statusCounts.offered / pipelineMax) * 100} 
                  className="h-2 bg-muted [&>div]:bg-purple-500" 
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Eingestellt</span>
                  <span className="text-sm font-medium">{data.statusCounts.hired}</span>
                </div>
                <Progress 
                  value={(data.statusCounts.hired / pipelineMax) * 100} 
                  className="h-2 bg-muted [&>div]:bg-emerald-500" 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Match Score Distribution */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-teal-600" />
              Score-Verteilung
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">90-100% (Exzellent)</span>
                  <span className="text-sm font-medium">{data.scoreDistribution.excellent}</span>
                </div>
                <Progress 
                  value={(data.scoreDistribution.excellent / scoreMax) * 100} 
                  className="h-2 bg-muted [&>div]:bg-emerald-500" 
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">80-89% (Gut)</span>
                  <span className="text-sm font-medium">{data.scoreDistribution.good}</span>
                </div>
                <Progress 
                  value={(data.scoreDistribution.good / scoreMax) * 100} 
                  className="h-2 bg-muted [&>div]:bg-teal-500" 
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">70-79% (Okay)</span>
                  <span className="text-sm font-medium">{data.scoreDistribution.fair}</span>
                </div>
                <Progress 
                  value={(data.scoreDistribution.fair / scoreMax) * 100} 
                  className="h-2 bg-muted [&>div]:bg-amber-500" 
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">60-69% (Unterdurchschnitt)</span>
                  <span className="text-sm font-medium">{data.scoreDistribution.belowAverage}</span>
                </div>
                <Progress 
                  value={(data.scoreDistribution.belowAverage / scoreMax) * 100} 
                  className="h-2 bg-muted [&>div]:bg-orange-500" 
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">{"<60% (Schwach)"}</span>
                  <span className="text-sm font-medium">{data.scoreDistribution.poor}</span>
                </div>
                <Progress 
                  value={(data.scoreDistribution.poor / scoreMax) * 100} 
                  className="h-2 bg-muted [&>div]:bg-red-500" 
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Card - only show if no candidates */}
      {data.totalCandidates === 0 && (
        <Card className="border border-border bg-muted/30">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              Analytics-Daten werden angezeigt, sobald Kandidaten gematcht und durch die Pipeline bewegt werden.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
