"use client"

import Link from "next/link"
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
} from "lucide-react"
import { EmptyState } from "@/components/empty-state"

const mockJobs = [
  {
    id: "1",
    title: "Senior Frontend Developer",
    company: "TechCorp GmbH",
    status: "active" as const,
    candidates: 24,
    topScore: 92,
    createdAt: "15.03.2024",
  },
  {
    id: "2",
    title: "Product Manager",
    company: "StartupXYZ",
    status: "active" as const,
    candidates: 18,
    topScore: 87,
    createdAt: "12.03.2024",
  },
  {
    id: "3",
    title: "UX Designer",
    company: "DesignStudio",
    status: "draft" as const,
    candidates: 0,
    topScore: 0,
    createdAt: "10.03.2024",
  },
  {
    id: "4",
    title: "Backend Engineer",
    company: "CloudServices AG",
    status: "active" as const,
    candidates: 31,
    topScore: 89,
    createdAt: "08.03.2024",
  },
  {
    id: "5",
    title: "Data Scientist",
    company: "Analytics Pro",
    status: "archived" as const,
    candidates: 15,
    topScore: 78,
    createdAt: "01.03.2024",
  },
  {
    id: "6",
    title: "DevOps Engineer",
    company: "InfraCloud",
    status: "active" as const,
    candidates: 12,
    topScore: 84,
    createdAt: "28.02.2024",
  },
]

const statusConfig = {
  active: { label: "Aktiv", className: "bg-success text-success-foreground" },
  draft: { label: "Entwurf", className: "bg-muted text-muted-foreground" },
  archived: { label: "Archiviert", className: "bg-muted/50 text-muted-foreground border border-border" },
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-success"
  if (score >= 60) return "text-warning-foreground"
  return "text-destructive"
}

export function JobsList() {
  if (mockJobs.length === 0) {
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
      {mockJobs.map((job) => (
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
                <Badge className={statusConfig[job.status].className}>
                  {statusConfig[job.status].label}
                </Badge>

                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{job.createdAt}</span>
                </div>

                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{job.candidates} Kandidaten</span>
                </div>

                {job.topScore > 0 && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <TrendingUp className={`h-4 w-4 ${getScoreColor(job.topScore)}`} />
                    <span className={getScoreColor(job.topScore)}>
                      Top: {job.topScore}%
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
