import { createClient } from "@/lib/supabase/server"
import { NextRequest } from "next/server"
import { poolMatchScore } from "@/lib/pool-match"

export const dynamic = "force-dynamic"

// Candidates below this heuristic score aren't worth surfacing as suggestions.
const SUGGEST_THRESHOLD = 55
// "Strong" pool matches — the headline number ("N passen über 80 %").
const STRONG_THRESHOLD = 80
const MAX_SUGGESTIONS = 8
// Upper bound on how much of the pool we scan (heuristic is cheap, but keep
// the request bounded).
const POOL_SCAN_LIMIT = 2000

/**
 * Talent-pool rediscovery: heuristically matches the user's existing candidate
 * pool against this job and returns the most promising people who are NOT yet
 * linked to it. No AI, no match-quota — the real IMLRS score runs only when the
 * recruiter adds a suggestion (via /api/candidates/[id]/match).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: jobId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })
    }

    const { data: job } = await supabase
      .from("jobs")
      .select("id, required_skills, nice_to_have_skills, years_experience, education, location")
      .eq("id", jobId)
      .eq("user_id", user.id)
      .single()
    if (!job) return Response.json({ error: "Job nicht gefunden" }, { status: 404 })

    // Candidates already on this job — exclude them from suggestions.
    const { data: links } = await supabase
      .from("job_candidates")
      .select("candidate_id")
      .eq("job_id", jobId)
    const linkedIds = new Set((links || []).map((l) => l.candidate_id))

    // The pool: this user's candidates.
    const { data: pool } = await supabase
      .from("candidates")
      .select("id, full_name, job_title, photo_url, skills, years_of_experience, experience_level, education, location")
      .eq("user_id", user.id)
      .limit(POOL_SCAN_LIMIT)

    let strongCount = 0
    const scored = (pool || [])
      .filter((c) => !linkedIds.has(c.id))
      .map((c) => {
        const { score, matchedSkills, missingSkills } = poolMatchScore(c, job)
        if (score >= STRONG_THRESHOLD) strongCount++
        return {
          id: c.id,
          full_name: c.full_name,
          job_title: c.job_title,
          photo_url: c.photo_url,
          years_of_experience: c.years_of_experience,
          location: c.location,
          score,
          matchedSkills,
          missingSkills,
        }
      })
      .filter((c) => c.score >= SUGGEST_THRESHOLD)
      .sort((a, b) => b.score - a.score)

    return Response.json({
      suggestions: scored.slice(0, MAX_SUGGESTIONS),
      strongCount,
      matchCount: scored.length,
      poolSize: (pool || []).length,
    })
  } catch (error) {
    console.error("Error building pool suggestions:", error)
    return Response.json({ error: "Interner Serverfehler" }, { status: 500 })
  }
}
