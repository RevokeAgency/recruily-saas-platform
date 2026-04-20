import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: candidates, error } = await supabase
      .from("candidates")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching candidates:", error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ candidates })
  } catch (error) {
    console.error("Error in candidates API:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const body = await req.json()

    const candidateData = {
      full_name: body.full_name,
      email: body.email || null,
      phone: body.phone || null,
      job_title: body.job_title || null,
      years_of_experience: body.years_of_experience || 0,
      experience_level: body.experience_level || "mid",
      skills: body.skills || [],
      education: body.education || null,
      summary_ai: body.summary_ai || null,
      location: body.location || null,
    }

    const { data: candidate, error } = await supabase
      .from("candidates")
      .insert(candidateData)
      .select()
      .single()

    if (error) {
      console.error("Error creating candidate:", error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    // If a jobId was provided, create the job_candidates link
    if (body.jobId && candidate) {
      const { error: linkError } = await supabase
        .from("job_candidates")
        .insert({
          job_id: body.jobId,
          candidate_id: candidate.id,
          status: "new",
        })

      if (linkError) {
        console.error("Error linking candidate to job:", linkError)
        // Don't fail the whole request, candidate was created successfully
      }
    }

    return Response.json({ candidate })
  } catch (error) {
    console.error("Error in candidates API:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
