"use client"

import Link from "next/link"
import useSWR from "swr"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Briefcase,
  Calendar,
  Users,
  MoreHorizontal,
  Eye,
  Pencil,
  Archive,
  Trash2,
  TrendingUp,
  Loader2,
} from "lucide-react"
import { EmptyState } from "@/components/empty-state"

interface Job {
  id: string
  title: string
  company: string
  is_active: boolean
  candidate_count: number
  top_match_score: number
  created_at: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function getStatus(isActive: boolean): "active" | "draft" {
  return isActive ? "active" : "draft"
}

const statusConfig = {
  active: { label: "Aktiv", className: "bg-success text-success-foreground" },
  draft: { label: "Entwurf", className: "bg-muted text-muted-foreground" },
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-success"
  if (score >= 60) return "text-warning-foreground"
  return "text-destructive"
}

export function JobsList() {
  const { data, error, isLoading } = useSWR<{ jobs: Job[] }>("/api/jobs", fetcher)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 text-destructive">
        Fehler beim Laden der Jobs
      </div>
    )
  }

  const jobs = data?.jobs || []

  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={Briefcase}
        title="Noch keine Jobs angelegt"
        description="Erstelle deinen ersten Job, um mit dem Kandidaten-Matching zu beginnen."
        actionLabel="Ersten Job erstellen"
        actionHref="/jobs/new"
      />
    )
  }

  return (
    <div className="grid gap-4">
      {jobs.map((job) => (
        <Card key={job.id} className="border border-border shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              {/* Job Info */}
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/jobs/${job.id}`}
                    className="font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {job.title}
                  </Link>
                  <p className="text-sm text-muted-foreground truncate">{job.company}</p>
                </div>
              </div>

              {/* Status & Metrics */}
              <div className="flex flex-wrap items-center gap-4 lg:gap-6">
                {(() => {
                  const status = getStatus(job.is_active)
                  return (
                    <Badge className={statusConfig[status].className}>
                      {statusConfig[status].label}
                    </Badge>
                  )
                })()}

                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(job.created_at).toLocaleDateString("de-DE")}</span>
                </div>

                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{job.candidate_count} Kandidaten</span>
                </div>

                {job.top_match_score > 0 && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <TrendingUp className={`h-4 w-4 ${getScoreColor(job.top_match_score)}`} />
                    <span className={getScoreColor(job.top_match_score)}>
                      Top: {job.top_match_score}%
                    </span>
                  </div>
                )}

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/jobs/${job.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        Anzeigen
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/jobs/${job.id}/edit`}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Bearbeiten
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Archive className="mr-2 h-4 w-4" />
                      Archivieren
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Löschen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
