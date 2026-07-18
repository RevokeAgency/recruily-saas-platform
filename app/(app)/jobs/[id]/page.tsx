"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  Users,
  BarChart3,
  Calendar,
  Clock,
  Loader2,
  Share2,
  Lock,
  Unlock,
} from "lucide-react"
import { toast } from "sonner"
import { JobOverviewTab } from "@/components/jobs/detail/overview-tab"
import { JobCandidatesTab } from "@/components/jobs/detail/candidates-tab"
import { JobApplicationsTab } from "@/components/jobs/detail/applications-tab"
import { JobAnalyticsTab } from "@/components/jobs/detail/analytics-tab"
import { JobChannelsModal } from "@/components/jobs/job-channels-modal"

interface Job {
  id: string
  title: string
  company: string
  location: string | null
  employment_type: string | null
  is_active: boolean
  public_slug: string | null
  created_at: string
  salary_range: string | null
  years_experience: string | null
  education: string | null
  description: string | null
  required_skills: string[] | null
  nice_to_have_skills: string[] | null
  languages: string[] | null
  candidate_count: number
  application_count: number
  match_count: number
  top_match_score: number
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const getEmploymentLabel = (type: string | null) => {
  switch (type) {
    case "full-time": return "Vollzeit"
    case "part-time": return "Teilzeit"
    case "contract": return "Befristet"
    case "remote": return "Remote"
    default: return type || "Vollzeit"
  }
}

export default function JobDetailPage() {
  const params = useParams()
  const jobId = params.id as string
  const [activeTab, setActiveTab] = useState("candidates")
  const [channelsOpen, setChannelsOpen] = useState(false)
  const [toggling, setToggling] = useState(false)

  const { data, error, isLoading, mutate } = useSWR<{ job: Job }>(
    jobId ? `/api/jobs/${jobId}` : null,
    fetcher
  )

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-muted-foreground">Laden...</p>
        </div>
      </div>
    )
  }

  if (error || !data?.job) {
    return (
      <div className="p-6 lg:p-8">
        <Button variant="outline" asChild className="mb-4 rounded-full">
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

  const toggleActive = async () => {
    setToggling(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !job.is_active }),
      })
      const result = await res.json()
      if (res.status === 403 && result.error === "job_limit_reached") {
        toast.error(`Job-Limit erreicht (${result.limit}). Schließe einen anderen Job oder upgrade.`)
        return
      }
      if (!res.ok) {
        toast.error(result.error || "Aktion fehlgeschlagen")
        return
      }
      toast.success(job.is_active ? "Job geschlossen — keine neuen Bewerbungen mehr" : "Job wieder geöffnet")
      mutate()
    } catch {
      toast.error("Aktion fehlgeschlagen")
    } finally {
      setToggling(false)
    }
  }

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

  const formattedDate = new Date(job.created_at).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "numeric",
    year: "numeric"
  })

  // Truncate description for header
  const shortDescription = job.description 
    ? job.description.slice(0, 60) + (job.description.length > 60 ? "..." : "")
    : ""

  return (
    <div className="p-6 lg:p-8">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" asChild size="sm" className="rounded-full bg-white">
          <Link href="/jobs">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück zu Jobs
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-full bg-white" onClick={() => setChannelsOpen(true)}>
            <Share2 className="mr-2 h-4 w-4" />
            Kanäle & Bewerbungslink
          </Button>
          <Button variant="outline" size="sm" className="rounded-full bg-white" onClick={toggleActive} disabled={toggling}>
            {job.is_active ? (
              <><Lock className="mr-2 h-4 w-4" /> Job schließen</>
            ) : (
              <><Unlock className="mr-2 h-4 w-4" /> Job öffnen</>
            )}
          </Button>
        </div>
      </div>

      {/* Job Title Section */}
      <div className="mb-6">
        <span className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[var(--rv-green-deep)]">
          Stellenangebot
        </span>
        <h1 className="mt-1.5 text-[1.85rem] font-bold leading-[1.1] tracking-tight text-foreground">{job.title}</h1>
        <p className="mt-1.5 text-muted-foreground">
          {job.company} {shortDescription && `• ${shortDescription}`}
        </p>
      </div>

      {/* Stats Cards — dashboard tile language: round brand chips + big numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Bewerbungen", value: String(job.application_count || 0), icon: Users, chip: "bg-[rgba(34,193,238,.12)] text-[var(--rv-cyan-deep)]" },
          { label: "Matches", value: String(job.match_count || 0), icon: BarChart3, chip: "bg-[var(--app-green-wash)] text-[var(--rv-green-deep)]" },
          { label: "Erstellt", value: formattedDate, icon: Calendar, chip: "bg-[var(--muted)] text-muted-foreground" },
          { label: "Art", value: getEmploymentLabel(job.employment_type), icon: Clock, chip: "bg-[var(--muted)] text-muted-foreground" },
        ].map(({ label, value, icon: Icon, chip }) => (
          <Card key={label} className="transition-shadow duration-150 ease-out hover:shadow-[0_2px_4px_rgba(12,26,22,.05),0_18px_40px_-18px_rgba(12,26,22,.16)]">
            <CardContent className="p-5">
              <div className="flex items-center gap-2.5">
                <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-full ${chip}`}>
                  <Icon className="h-[17px] w-[17px]" strokeWidth={2} />
                </span>
                <span className="text-[0.78rem] font-medium text-muted-foreground">{label}</span>
              </div>
              <p className="mt-3.5 text-2xl font-bold leading-none tracking-tight text-foreground tabular-nums">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 h-12 w-full max-w-xl rounded-full bg-white p-1 shadow-[0_1px_2px_rgba(12,26,22,.06),0_6px_16px_-8px_rgba(12,26,22,.10)]">
          {[
            { value: "candidates", label: "Kandidaten" },
            { value: "overview", label: "Überblick" },
            { value: "applications", label: "Bewerbungen" },
            { value: "analytics", label: "Statistiken" },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex-1 rounded-full data-[state=active]:bg-[var(--rv-ink)] data-[state=active]:text-white"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="candidates">
          <JobCandidatesTab 
            jobId={jobId} 
            jobTitle={job.title} 
            job={{
              id: job.id,
              title: job.title,
              company: job.company,
              location: job.location || undefined,
              employment_type: job.employment_type || undefined,
              required_skills: job.required_skills || undefined,
              nice_to_have_skills: job.nice_to_have_skills || undefined,
              years_experience: job.years_experience || undefined,
              education: job.education || undefined,
              description: job.description || undefined,
            }}
          />
        </TabsContent>

        <TabsContent value="overview">
          <JobOverviewTab job={jobForOverview} />
        </TabsContent>

        <TabsContent value="applications">
          <JobApplicationsTab jobId={jobId} />
        </TabsContent>

        <TabsContent value="analytics">
          <JobAnalyticsTab jobId={jobId} />
        </TabsContent>
      </Tabs>

      <JobChannelsModal
        isOpen={channelsOpen}
        onClose={() => setChannelsOpen(false)}
        jobId={jobId}
        jobTitle={job.title}
        jobSlug={job.public_slug ?? undefined}
      />
    </div>
  )
}
