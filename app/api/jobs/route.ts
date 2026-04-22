import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get all jobs
    const { data: jobs, error } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching jobs:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get candidate stats for all jobs
    const { data: allJobCandidates, error: candidatesError } = await supabase
      .from("job_candidates")
      .select("job_id, match_score")

    if (candidatesError) {
      console.error("[v0] Error fetching job candidates:", candidatesError)
    }

    const candidates = allJobCandidates || []

    // Enrich jobs with candidate stats
    const enrichedJobs = (jobs || []).map(job => {
      const jobCandidates = candidates.filter(c => c.job_id === job.id)
      const candidateCount = jobCandidates.length
      const topMatchScore = jobCandidates.length > 0 
        ? Math.max(...jobCandidates.map(c => c.match_score || 0))
        : 0

      return {
        ...job,
        candidate_count: candidateCount,
        top_match_score: topMatchScore,
      }
    })

    return NextResponse.json({ jobs: enrichedJobs })
  } catch (error) {
    console.error("[v0] Error in GET /api/jobs:", error)
    return NextResponse.json({ error: "Fehler beim Laden der Jobs" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const body = await req.json()

    // Transform camelCase to snake_case for database
    const jobData = {
      title: body.title,
      company: body.company,
      location: body.location || null,
      employment_type: body.employmentType || "full-time",
      salary_range: body.salaryRange || null,
      description: body.description || null,
      required_skills: body.requiredSkills || [],
      nice_to_have_skills: body.niceToHaveSkills || [],
      years_experience: body.yearsExperience || null,
      education: body.education || null,
      languages: body.languages || [],
      is_active: body.isActive ?? true,
    }

    const { data: job, error } = await supabase
      .from("jobs")
      .insert(jobData)
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating job:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ job })
  } catch (error) {
    console.error("[v0] Error in POST /api/jobs:", error)
    return NextResponse.json({ error: "Fehler beim Erstellen des Jobs" }, { status: 500 })
  }
}
