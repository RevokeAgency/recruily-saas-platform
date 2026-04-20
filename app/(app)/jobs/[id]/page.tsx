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
  Settings,
  Users,
  BarChart3,
  Calendar,
  Clock,
  Loader2,
} from "lucide-react"
import { JobOverviewTab } from "@/components/jobs/detail/overview-tab"
import { JobCandidatesTab } from "@/components/jobs/detail/candidates-tab"
import { JobApplicationsTab } from "@/components/jobs/detail/applications-tab"
import { JobAnalyticsTab } from "@/components/jobs/detail/analytics-tab"

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

const getEmploymentLabel = (type: string | null) => {
  switch (type) {
    case "full-time": return "Full Time"
    case "part-time": return "Part Time"
    case "contract": return "Contract"
    case "remote": return "Remote"
    default: return type || "Full Time"
  }
}

export default function JobDetailPage() {
  const params = useParams()
  const jobId = params.id as string
  const [activeTab, setActiveTab] = useState("candidates")

  const { data, error, isLoading } = useSWR<{ job: Job }>(
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
        <Button variant="outline" asChild className="mb-4">
          <Link href="/jobs">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Jobs
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
        <Button variant="outline" asChild size="sm">
          <Link href="/jobs">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Jobs
          </Link>
        </Button>
        <Button variant="outline" size="sm">
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
      </div>

      {/* Job Title Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">{job.title}</h1>
        <p className="text-slate-500">
          {job.company} {shortDescription && `• ${shortDescription}`}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Applications */}
        <Card className="border border-slate-200 bg-white rounded-xl hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center transition-transform duration-300 hover:scale-110">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Applications</p>
              <p className="text-2xl font-bold text-foreground">0</p>
            </div>
          </CardContent>
        </Card>

        {/* Matches */}
        <Card className="border border-slate-200 bg-white rounded-xl hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center transition-transform duration-300 hover:scale-110">
              <BarChart3 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Matches</p>
              <p className="text-2xl font-bold text-foreground">{job.candidate_count}</p>
            </div>
          </CardContent>
        </Card>

        {/* Posted */}
        <Card className="border border-slate-200 bg-white rounded-xl hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center transition-transform duration-300 hover:scale-110">
              <Calendar className="h-6 w-6 text-pink-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Posted</p>
              <p className="text-2xl font-bold text-foreground">{formattedDate}</p>
            </div>
          </CardContent>
        </Card>

        {/* Type */}
        <Card className="border border-slate-200 bg-white rounded-xl hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center transition-transform duration-300 hover:scale-110">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="text-2xl font-bold text-foreground">{getEmploymentLabel(job.employment_type)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-4 mb-6 h-12 bg-muted/50">
          <TabsTrigger 
            value="candidates" 
            className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            Candidates
          </TabsTrigger>
          <TabsTrigger 
            value="overview"
            className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="applications"
            className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            Applications
          </TabsTrigger>
          <TabsTrigger 
            value="analytics"
            className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="candidates">
          <JobCandidatesTab jobId={jobId} jobTitle={job.title} />
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
    </div>
  )
}
