import { createClient } from "@/lib/supabase/server"

// Recent activity for the sidebar bell: the newest candidate/application
// events for the signed-in user (who applied, to which job, how, and the
// match result). Owner-scoped via RLS + explicit user_id filter.
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ activities: [] }, { status: 401 })

    const { data, error } = await supabase
      .from("job_candidates")
      .select("id, status, match_score, source, created_at, candidate:candidates(full_name), job:jobs(title)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(15)

    if (error) {
      console.error("[activities] query failed:", error)
      return Response.json({ activities: [] }, { status: 500 })
    }

    const activities = (data || []).map((r) => {
      const candidate = r.candidate as { full_name?: string } | null
      const job = r.job as { title?: string } | null
      return {
        id: r.id as string,
        candidateName: candidate?.full_name ?? "Unbekannt",
        jobTitle: job?.title ?? "",
        status: r.status as string,
        matchScore: (r.match_score as number | null) ?? null,
        source: (r.source as string) ?? "manual",
        createdAt: r.created_at as string,
      }
    })

    return Response.json({ activities })
  } catch (error) {
    console.error("[activities] error:", error)
    return Response.json({ activities: [] }, { status: 500 })
  }
}
