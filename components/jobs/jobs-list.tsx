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
  MapPin,
  MoreHorizontal,
  Eye,
  Pencil,
  Archive,
  Trash2,
  Loader2,
  Users2,
} from "lucide-react"
import { EmptyState } from "@/components/empty-state"

interface Job {
  id: string
  title: string
  company: string
  location: string | null
  description: string | null
  employment_type: string | null
  salary_range: string | null
  years_experience: string | null
  required_skills: string[] | null
  is_active: boolean
  candidate_count: number
  top_match_score: number
  created_at: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function JobsList() {
  const { data, error, isLoading, mutate } = useSWR<{ jobs: Job[] }>("/api/jobs", fetcher)

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

  // Helper to get employment type label
  const getEmploymentLabel = (type: string | null) => {
    switch (type) {
      case "full-time": return "Full time"
      case "part-time": return "Part time"
      case "contract": return "Contract"
      case "remote": return "Remote"
      default: return type || "Full time"
    }
  }

  // Truncate description
  const truncateText = (text: string | null, maxLength: number = 100) => {
    if (!text) return ""
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {jobs.map((job) => (
        <Card key={job.id} className="border border-border shadow-sm hover:shadow-md transition-shadow flex flex-col">
          <CardContent className="p-5 flex flex-col flex-1">
            {/* Header with title, badge, menu */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground text-lg leading-tight">
                  {job.title}
                </h3>
                <Badge 
                  variant="outline" 
                  className={job.is_active 
                    ? "bg-primary/10 text-primary border-primary/30 uppercase text-xs font-medium" 
                    : "bg-muted text-muted-foreground uppercase text-xs font-medium"
                  }
                >
                  {job.is_active ? "Active" : "Draft"}
                </Badge>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/jobs/${job.id}`}>
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/jobs/${job.id}/edit`}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Company */}
            <p className="text-sm text-muted-foreground mb-1">{job.company}</p>

            {/* Location */}
            {job.location && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
                <MapPin className="h-3.5 w-3.5" />
                <span>{job.location}</span>
              </div>
            )}

            {/* Stats Row */}
            <div className="flex items-center gap-6 py-3 px-4 bg-muted/50 rounded-lg mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{job.candidate_count}</p>
                <p className="text-xs text-muted-foreground">Candidates</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{job.top_match_score}%</p>
                <p className="text-xs text-muted-foreground">Match</p>
              </div>
              <div className="text-sm text-primary ml-auto">
                {new Date(job.created_at).toLocaleDateString("de-DE")}
              </div>
            </div>

            {/* Description preview */}
            {job.description && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {truncateText(job.description, 120)}
              </p>
            )}

            {/* Employment type & salary */}
            {(job.employment_type || job.salary_range) && (
              <p className="text-sm text-muted-foreground mb-1">
                <span className="font-medium text-foreground">{getEmploymentLabel(job.employment_type)}</span>
                {job.salary_range && `: ${job.salary_range}`}
              </p>
            )}

            {/* Experience */}
            {job.years_experience && (
              <p className="text-sm text-muted-foreground mb-3">
                Experience: {job.years_experience}
              </p>
            )}

            {/* Skills */}
            {job.required_skills && job.required_skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4 mt-auto">
                {job.required_skills.slice(0, 4).map((skill, idx) => (
                  <Badge 
                    key={idx} 
                    variant="outline" 
                    className="text-xs font-normal bg-background"
                  >
                    {skill}
                  </Badge>
                ))}
                {job.required_skills.length > 4 && (
                  <Badge 
                    variant="outline" 
                    className="text-xs font-normal bg-background"
                  >
                    +{job.required_skills.length - 4}
                  </Badge>
                )}
              </div>
            )}

            {/* Open Workspace Button */}
            <Button asChild className="w-full mt-auto">
              <Link href={`/jobs/${job.id}`}>
                <Users2 className="mr-2 h-4 w-4" />
                Open Workspace
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function useJobsRefresh() {
  const { mutate } = useSWR<{ jobs: Job[] }>("/api/jobs", fetcher)
  return mutate
}
