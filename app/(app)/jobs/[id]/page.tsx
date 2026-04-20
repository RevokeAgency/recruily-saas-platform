"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  Pencil,
  Archive,
  Share2,
  MapPin,
  Clock,
  Calendar,
  Briefcase,
  Loader2,
} from "lucide-react"
import { JobOverviewTab } from "@/components/jobs/detail/overview-tab"
import { JobCandidatesTab } from "@/components/jobs/detail/candidates-tab"
import { JobMatchesTab } from "@/components/jobs/detail/matches-tab"

interface Job {
  id: string
  title: string
  company: string
  location: string | null
  employment_type: string | null
  is_active: boolean
  created_at: string
  salary_range: string | null
  years_experience: string | null
  education: string | null
  description: string | null
  required_skills: string[] | null
  nice_to_have_skills: string[] | null
  languages: string[] | null
  candidate_count: number
  top_match_score: number
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const statusConfig = {
  active: { label: "Aktiv", className: "bg-success text-success-foreground" },
  draft: { label: "Entwurf", className: "bg-muted text-muted-foreground" },
}

const getEmploymentLabel = (type: string | null) => {
  switch (type) {
    case "full-time": return "Vollzeit"
    case "part-time": return "Teilzeit"
    case "contract": return "Vertrag"
    case "remote": return "Remote"
    default: return type || "Vollzeit"
  }
}

export default function JobDetailPage() {
  const params = useParams()
  const jobId = params.id as string
  const [activeTab, setActiveTab] = useState("overview")

  const { data, error, isLoading } = useSWR<{ job: Job }>(
    jobId ? `/api/jobs/${jobId}` : null,
    fetcher
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    )
  }

  if (error || !data?.job) {
    return (
      <div className="p-6 lg:p-8">
        <Button variant="ghost" asChild className="mb-4 -ml-2">
          <Link href="/jobs">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück zu Jobs
          </Link>
        </Button>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-foreground mb-2">Job nicht gefunden</h2>
          <p className="text-muted-foreground">Der angeforderte Job existiert nicht oder wurde gelöscht.</p>
        </div>
      </div>
    )
  }

  const job = data.job
  const status = job.is_active ? "active" : "draft"

  // Transform job data for the overview component
  const jobForOverview = {
    title: job.title,
    company: job.company,
    location: job.location || "",
    employmentType: getEmploymentLabel(job.employment_type),
    salaryRange: job.salary_range || "",
    yearsExperience: job.years_experience || "",
    education: job.education || "",
    description: job.description || "",
    requiredSkills: job.required_skills || [],
    niceToHaveSkills: job.nice_to_have_skills || [],
    languages: job.languages || [],
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Back Button */}
      <Button variant="ghost" asChild className="mb-4 -ml-2">
        <Link href="/jobs">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück zu Jobs
        </Link>
      </Button>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Briefcase className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-semibold text-foreground">{job.title}</h1>
              <Badge className={statusConfig[status].className}>
                {statusConfig[status].label}
              </Badge>
            </div>
            <p className="text-muted-foreground">{job.company}</p>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
              {job.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {job.location}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {getEmploymentLabel(job.employment_type)}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                Erstellt am {new Date(job.created_at).toLocaleDateString("de-DE")}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm">
            <Share2 className="mr-2 h-4 w-4" />
            Teilen
          </Button>
          <Button variant="outline" size="sm">
            <Archive className="mr-2 h-4 w-4" />
            Archivieren
          </Button>
          <Button size="sm">
            <Pencil className="mr-2 h-4 w-4" />
            Bearbeiten
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="candidates">
            Kandidaten ({job.candidate_count})
          </TabsTrigger>
          <TabsTrigger value="matches">Match-Analyse</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <JobOverviewTab job={jobForOverview} />
        </TabsContent>

        <TabsContent value="candidates">
          <JobCandidatesTab />
        </TabsContent>

        <TabsContent value="matches">
          <JobMatchesTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
