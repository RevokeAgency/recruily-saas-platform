import { createClient } from "@supabase/supabase-js"
import { NextRequest } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Public, unauthenticated route — uses anon key, RLS read-only.
    // Created inside the handler so build-time page-data collection
    // does not require the env vars to be present.
    const supabasePublic = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: job, error } = await supabasePublic
      .from("jobs")
      .select("id, title, company, location, employment_type, description, required_skills, nice_to_have_skills, years_experience, education, languages, salary_range, user_id")
      .eq("id", id)
      .eq("is_active", true)
      .single()

    if (error || !job) {
      return Response.json({ error: "Job nicht gefunden" }, { status: 404 })
    }

    return Response.json({ job })
  } catch (error) {
    console.error("[v0] Error fetching public job:", error)
    return Response.json({ error: "Interner Serverfehler" }, { status: 500 })
  }
}
