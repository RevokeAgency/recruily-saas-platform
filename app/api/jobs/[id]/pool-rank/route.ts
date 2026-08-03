import { createClient } from "@/lib/supabase/server"
import { NextRequest } from "next/server"
import { rankPool, type PoolRankCandidate } from "@/lib/matching/pool-rank"

export const dynamic = "force-dynamic"
export const maxDuration = 300

// Compare at most this many candidates (top by match score) in one run.
const MAX_RANKED = 10

const DETAIL_LABELS: Record<string, string> = {
  hardSkills: "Hard Skills", experience: "Erfahrung", education: "Ausbildung",
  softSkills: "Soft Skills", languages: "Sprachen", location: "Standort",
  industry: "Branche", salary: "Gehalt", culture: "Kultur",
}

/**
 * Bestenvergleich: ranks this job's scored candidates against each other
 * (comparative judgment) and stores rank + reasoning per link. Re-evaluation
 * of already-paid matches → consumes NO match quota. Owner-scoped.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: jobId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

    const { data: job } = await supabase
      .from("jobs")
      .select("id, title, company, required_skills, description")
      .eq("id", jobId)
      .eq("user_id", user.id)
      .single()
    if (!job) return Response.json({ error: "Job nicht gefunden" }, { status: 404 })

    // Scored, not rejected, not knocked out — the actual field to compare.
    const { data: links, error: linksErr } = await supabase
      .from("job_candidates")
      .select(
        "id, status, match_score, interview_score, hard_skills_score, experience_score, " +
          "ai_summary, knockout, match_detail, candidate:candidates(full_name, dossier)",
      )
      .eq("job_id", jobId)
      .eq("user_id", user.id)
      .not("match_score", "is", null)
      .neq("status", "Abgesagt")
      .order("match_score", { ascending: false })
      .limit(MAX_RANKED * 2)
    if (linksErr) {
      if (/pool_rank|match_detail|interview_score|dossier/i.test(linksErr.message || "")) {
        return Response.json(
          { error: "Bestenvergleich benötigt die Migrationen 020-022 — bitte in Supabase ausführen." },
          { status: 400 },
        )
      }
      return Response.json({ error: linksErr.message }, { status: 500 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eligible = (links as any[] | null || []).filter((l) => l.knockout !== true).slice(0, MAX_RANKED)
    if (eligible.length < 2) {
      return Response.json(
        { error: "Mindestens 2 bewertete Kandidaten (ohne KO) nötig für den Bestenvergleich." },
        { status: 400 },
      )
    }

    const one = (v: unknown) => (Array.isArray(v) ? v[0] ?? {} : v ?? {}) as { full_name?: string; dossier?: { summary?: string } | null }

    const input: PoolRankCandidate[] = eligible.map((l) => {
      const cand = one(l.candidate)
      const detailCats: Record<string, { konfidenz?: string }> = l.match_detail?.categories ?? {}
      const lowConfidence = Object.entries(detailCats)
        .filter(([, d]) => d?.konfidenz === "niedrig")
        .map(([k]) => DETAIL_LABELS[k] ?? k)
      return {
        linkId: l.id as string,
        name: cand.full_name ?? "Unbekannt",
        matchScore: l.match_score as number,
        interviewScore: (l.interview_score as number | null) ?? null,
        hardSkills: (l.hard_skills_score as number | null) ?? null,
        experience: (l.experience_score as number | null) ?? null,
        aiSummary: (l.ai_summary as string | null) ?? null,
        lowConfidence,
        dossierSummary: cand.dossier?.summary ?? null,
      }
    })

    const result = await rankPool(job, input)

    // Reset stale ranks for the whole job, then write the fresh ordering.
    const rankedAt = new Date().toISOString()
    const { error: resetErr } = await supabase
      .from("job_candidates")
      .update({ pool_rank: null, pool_rank_reason: null, pool_ranked_at: null })
      .eq("job_id", jobId)
      .eq("user_id", user.id)
    if (resetErr && /pool_rank/i.test(resetErr.message || "")) {
      return Response.json(
        { error: "Bestenvergleich benötigt Migration 022_feedback_loop.sql — bitte in Supabase ausführen." },
        { status: 400 },
      )
    }
    for (const r of result.rankings) {
      await supabase
        .from("job_candidates")
        .update({ pool_rank: r.rank, pool_rank_reason: r.begruendung, pool_ranked_at: rankedAt })
        .eq("id", r.linkId)
        .eq("user_id", user.id)
    }

    const topLink = result.rankings.find((r) => r.rank === 1)
    const topName = input.find((c) => c.linkId === topLink?.linkId)?.name ?? null

    return Response.json({
      ranked: result.rankings.length,
      topName,
      topEmpfehlung: result.topEmpfehlung,
      vergleichsanalyse: result.vergleichsanalyse,
    })
  } catch (error) {
    console.error("Error in pool ranking:", error)
    return Response.json({ error: "Bestenvergleich fehlgeschlagen" }, { status: 500 })
  }
}
