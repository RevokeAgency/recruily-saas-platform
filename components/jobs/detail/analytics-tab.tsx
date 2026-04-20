"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  Target,
  Eye,
} from "lucide-react"

interface JobAnalyticsTabProps {
  jobId: string
}

export function JobAnalyticsTab({ jobId }: JobAnalyticsTabProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Analytics</h2>
        <p className="text-muted-foreground text-sm">
          Track performance metrics and insights for this job posting
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">0</p>
                <p className="text-xs text-muted-foreground">Views</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">0</p>
                <p className="text-xs text-muted-foreground">Applicants</p>
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
                <p className="text-2xl font-bold text-foreground">0%</p>
                <p className="text-xs text-muted-foreground">Conversion</p>
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
                <p className="text-2xl font-bold text-foreground">0 days</p>
                <p className="text-xs text-muted-foreground">Avg. Time to Hire</p>
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
              <BarChart3 className="h-5 w-5 text-primary" />
              Candidate Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">New</span>
                  <span className="text-sm font-medium">0</span>
                </div>
                <Progress value={0} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Screened</span>
                  <span className="text-sm font-medium">0</span>
                </div>
                <Progress value={0} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Interviewed</span>
                  <span className="text-sm font-medium">0</span>
                </div>
                <Progress value={0} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Offered</span>
                  <span className="text-sm font-medium">0</span>
                </div>
                <Progress value={0} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Hired</span>
                  <span className="text-sm font-medium">0</span>
                </div>
                <Progress value={0} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Match Score Distribution */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Match Score Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">90-100% (Excellent)</span>
                  <span className="text-sm font-medium">0</span>
                </div>
                <Progress value={0} className="h-2 bg-muted [&>div]:bg-emerald-500" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">80-89% (Good)</span>
                  <span className="text-sm font-medium">0</span>
                </div>
                <Progress value={0} className="h-2 bg-muted [&>div]:bg-primary" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">70-79% (Fair)</span>
                  <span className="text-sm font-medium">0</span>
                </div>
                <Progress value={0} className="h-2 bg-muted [&>div]:bg-amber-500" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">60-69% (Below Average)</span>
                  <span className="text-sm font-medium">0</span>
                </div>
                <Progress value={0} className="h-2 bg-muted [&>div]:bg-orange-500" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">{`<60% (Poor)`}</span>
                  <span className="text-sm font-medium">0</span>
                </div>
                <Progress value={0} className="h-2 bg-muted [&>div]:bg-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="border border-border bg-muted/30">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">
            Analytics data will populate as candidates are matched and progress through your hiring pipeline.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
