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

    // Every job belongs to the authenticated user (multi-tenant scoping)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 })
    }

    // Enforce the active-job limit only when creating an ACTIVE job.
    // Drafts (isActive === false) are always allowed.
    const willBeActive = body.isActive ?? true
    if (willBeActive) {
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("active_jobs_limit")
        .eq("id", user.id)
        .single()

      if (profileError || !profile) {
        return NextResponse.json({ error: "Profil nicht gefunden" }, { status: 404 })
      }

      const limit = profile.active_jobs_limit ?? 1

      const { count, error: countError } = await supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .eq("user_id", user.id)

      if (countError) {
        console.error("[v0] Error counting active jobs:", countError)
        return NextResponse.json({ error: countError.message }, { status: 500 })
      }

      if ((count ?? 0) >= limit) {
        return NextResponse.json(
          { error: "job_limit_reached", limit },
          { status: 403 }
        )
      }
    }

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
      user_id: user.id,
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
