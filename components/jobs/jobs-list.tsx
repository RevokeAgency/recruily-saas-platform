"use client"

import { useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import { toast } from "sonner"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Briefcase,
  MapPin,
  MoreHorizontal,
  Eye,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  Users2,
  Loader2,
} from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { Skeleton } from "@/components/ui/skeleton"

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
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const toggleArchive = async (job: Job) => {
    setBusyId(job.id)
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !job.is_active }),
      })
      const result = await res.json()
      if (res.status === 403 && result.error === "job_limit_reached") {
        toast.error(`Job-Limit erreicht (${result.limit}). Schließe einen anderen Job oder upgrade.`)
        return
      }
      if (!res.ok) { toast.error(result.error || "Aktion fehlgeschlagen"); return }
      toast.success(job.is_active ? "Job archiviert" : "Job reaktiviert")
      mutate()
    } catch {
      toast.error("Aktion fehlgeschlagen")
    } finally {
      setBusyId(null)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/jobs/${deleteTarget.id}`, { method: "DELETE" })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(result.error || "Löschen fehlgeschlagen"); return }
      toast.success("Job gelöscht")
      setDeleteTarget(null)
      mutate()
    } catch {
      toast.error("Löschen fehlgeschlagen")
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="flex flex-col p-6">
            <Skeleton className="h-5 w-2/3 mb-3" />
            <Skeleton className="h-3.5 w-1/3 mb-4" />
            <Skeleton className="h-16 w-full rounded-[10px] mb-4" />
            <Skeleton className="h-3.5 w-full mb-2" />
            <Skeleton className="h-3.5 w-4/5 mb-5" />
            <Skeleton className="h-10 w-full mt-auto" />
          </Card>
        ))}
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
        <Card
          key={job.id}
          className="flex flex-col transition-shadow duration-150 ease-out hover:shadow-[0_1px_2px_rgba(12,26,22,.04),0_14px_32px_-14px_rgba(12,26,22,.14)]"
        >
          <CardContent className="p-6 flex flex-col flex-1">
            {/* Header with title, badge, menu */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="font-bold text-slate-900 text-lg leading-tight">
                  {job.title}
                </h3>
                <Badge 
                  className={job.is_active 
                    ? "status-active uppercase text-xs font-medium px-2.5 py-0.5" 
                    : "status-draft uppercase text-xs font-medium px-2.5 py-0.5"
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
                      Ansehen
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/jobs/${job.id}/edit`}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Bearbeiten
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={busyId === job.id}
                    onSelect={(e) => { e.preventDefault(); toggleArchive(job) }}
                  >
                    {busyId === job.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : job.is_active ? (
                      <Archive className="mr-2 h-4 w-4" />
                    ) : (
                      <ArchiveRestore className="mr-2 h-4 w-4" />
                    )}
                    {job.is_active ? "Archivieren" : "Reaktivieren"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={(e) => { e.preventDefault(); setDeleteTarget(job) }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Löschen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Company */}
            <p className="text-sm text-slate-600 mb-1">{job.company}</p>

            {/* Location */}
            {job.location && (
              <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-4">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                <span>{job.location}</span>
              </div>
            )}

            {/* Stats Row */}
            <div className="flex items-center gap-6 py-4 px-5 bg-[var(--rv-mist)] rounded-[10px] mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground tabular-nums">{job.candidate_count}</p>
                <p className="text-xs text-muted-foreground">Candidates</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground tabular-nums">{job.top_match_score}%</p>
                <p className="text-xs text-muted-foreground">Match</p>
              </div>
              <div className="text-sm text-[var(--rv-green-deep)] font-medium ml-auto tabular-nums">
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
              <div className="flex flex-wrap gap-2 mb-5 mt-auto pt-2">
                {job.required_skills.slice(0, 4).map((skill, idx) => (
                  <span 
                    key={idx} 
                    className="bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-xs font-medium hover:bg-teal-100 transition-colors"
                  >
                    {skill}
                  </span>
                ))}
                {job.required_skills.length > 4 && (
                  <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-medium">
                    +{job.required_skills.length - 4}
                  </span>
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !isDeleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Job löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du <span className="font-semibold">{deleteTarget?.title}</span> wirklich löschen?
              Der Job und die Zuordnungen der Kandidaten zu diesem Job werden entfernt. Die Kandidaten
              selbst bleiben im Pool erhalten. Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete() }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Löschen…</>) : "Endgültig löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export function useJobsRefresh() {
  const { mutate } = useSWR<{ jobs: Job[] }>("/api/jobs", fetcher)
  return mutate
}
