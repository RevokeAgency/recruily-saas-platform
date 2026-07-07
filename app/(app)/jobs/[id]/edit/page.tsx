"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import { JobEditForm, type JobEditInitial } from "@/components/jobs/job-edit-form"

interface Job {
  id: string
  title: string
  company: string
  location: string | null
  employment_type: string | null
  salary_range: string | null
  years_experience: string | null
  education: string | null
  description: string | null
  required_skills: string[] | null
  nice_to_have_skills: string[] | null
  languages: string[] | null
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function JobEditPage() {
  const params = useParams()
  const jobId = params.id as string
  const { data, error, isLoading } = useSWR<{ job: Job }>(jobId ? `/api/jobs/${jobId}` : null, fetcher)

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6 lg:p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !data?.job) {
    return (
      <div className="p-6 lg:p-8">
        <Button variant="outline" size="sm" asChild className="mb-4">
          <Link href="/jobs"><ArrowLeft className="mr-2 h-4 w-4" /> Zurück zu Jobs</Link>
        </Button>
        <div className="py-12 text-center">
          <h2 className="mb-2 text-xl font-semibold text-foreground">Job nicht gefunden</h2>
          <p className="text-muted-foreground">Der angeforderte Job existiert nicht oder wurde gelöscht.</p>
        </div>
      </div>
    )
  }

  const j = data.job
  const initial: JobEditInitial = {
    title: j.title || "",
    company: j.company || "",
    location: j.location || "",
    employmentType: j.employment_type || "full-time",
    salaryRange: j.salary_range || "",
    yearsExperience: j.years_experience || "",
    education: j.education || "",
    description: j.description || "",
    requiredSkills: j.required_skills || [],
    niceToHaveSkills: j.nice_to_have_skills || [],
    languages: j.languages || [],
  }

  return <JobEditForm jobId={jobId} initial={initial} />
}
