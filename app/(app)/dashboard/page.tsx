import { DashboardHero } from "@/components/dashboard/dashboard-hero"
import { MatchBackfillTrigger } from "@/components/dashboard/match-backfill-trigger"
import { DashboardMetrics, type DashboardMetricsData } from "@/components/dashboard/metrics"
import { RecentActivity, type RecentJob } from "@/components/dashboard/recent-activity"
import { QuotaProgress } from "@/components/dashboard/quota-progress"
import { ScoreGauge } from "@/components/dashboard/score-gauge"
import { Priorities, type PriorityItem } from "@/components/dashboard/priorities"
import { RevealGroup } from "@/components/app/reveal-group"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

function timeAgo(dateString: string): string {
  const date = new Date(dateString)
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)

  if (weeks >= 1) return weeks === 1 ? "vor 1 Woche" : `vor ${weeks} Wochen`
  if (days >= 1) return days === 1 ? "vor 1 Tag" : `vor ${days} Tagen`
  if (hours >= 1) return hours === 1 ? "vor 1 Stunde" : `vor ${hours} Stunden`
  if (minutes >= 1) return minutes === 1 ? "vor 1 Minute" : `vor ${minutes} Minuten`
  return "gerade eben"
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Default/empty state (also covers the unauthenticated edge case)
  let metricsData: DashboardMetricsData = {
    activeJobs: 0,
    newJobsThisWeek: 0,
    totalCandidates: 0,
    newCandidatesThisMonth: 0,
    matchesUsed: 0,
    matchesLimit: 0,
    activeJobsLimit: 1,
    avgMatchScore: 0,
    scoredCount: 0,
  }
  let recentJobs: RecentJob[] = []
  let firstName: string | null = null
  let priorities: PriorityItem[] = []

  if (user) {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    // RLS scopes these to the current user; the explicit user_id filters are belt-and-suspenders.
    const [
      activeJobsRes,
      newJobsRes,
      totalCandidatesRes,
      newCandidatesRes,
      usageRes,
      matchScoresRes,
      jobsListRes,
      profileRes,
      reviewCountRes,
      queuedCountRes,
      unassignedCountRes,
    ] = await Promise.all([
      supabase.from("jobs").select("id", { count: "exact", head: true })
        .eq("is_active", true).eq("user_id", user.id),
      supabase.from("jobs").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).gte("created_at", weekAgo),
      supabase.from("candidates").select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase.from("candidates").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).gte("created_at", monthStart),
      // match_usage applies the monthly reset virtually, so the numbers are
      // correct even at the start of a new month before the next match.
      supabase.rpc("match_usage", { p_user: user.id }),
      supabase.from("job_candidates").select("match_score")
        .eq("user_id", user.id).not("match_score", "is", null),
      supabase.from("jobs").select("id, title, company, is_active, created_at")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
      // Read-only signals for the greeting + Prioritäten card.
      supabase.from("user_profiles").select("first_name").eq("id", user.id).single(),
      supabase.from("job_candidates").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).in("status", ["new", "analyzing"]),
      supabase.from("job_candidates").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).eq("status", "queued"),
      supabase.from("inbound_emails").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).eq("status", "unassigned"),
    ])

    const usage = (usageRes.data ?? null) as
      | { used: number; limit: number; active_jobs_limit: number }
      | null

    // Average match score
    const scores = (matchScoresRes.data || [])
      .map((r) => r.match_score as number)
      .filter((s) => typeof s === "number")
    const avgMatchScore = scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
      : 0

    metricsData = {
      activeJobs: activeJobsRes.count ?? 0,
      newJobsThisWeek: newJobsRes.count ?? 0,
      totalCandidates: totalCandidatesRes.count ?? 0,
      newCandidatesThisMonth: newCandidatesRes.count ?? 0,
      matchesUsed: usage?.used ?? 0,
      matchesLimit: usage?.limit ?? 0,
      activeJobsLimit: usage?.active_jobs_limit ?? 1,
      avgMatchScore,
      scoredCount: scores.length,
    }

    firstName = (profileRes.data?.first_name as string | null) ?? null

    // Build the Prioritäten list, most urgent first, capped at five.
    const reviewCount = reviewCountRes.count ?? 0
    const queuedCount = queuedCountRes.count ?? 0
    const unassignedCount = unassignedCountRes.count ?? 0
    const limit = metricsData.matchesLimit
    const remaining = Math.max(limit - metricsData.matchesUsed, 0)
    const exhausted = limit > 0 && remaining <= 0
    const low = limit > 0 && remaining / limit <= 0.2

    if (metricsData.activeJobs === 0) {
      priorities.push({
        id: "firstjob", kind: "firstjob",
        title: "Ersten Job anlegen",
        subtitle: "Starte dein erstes Matching",
        href: "/jobs/new",
      })
    }
    if (exhausted) {
      priorities.push({
        id: "quota", kind: "quota",
        title: "Kontingent aufgebraucht",
        subtitle: "Upgrade für weitere Matches",
        href: "/subscription",
      })
    } else if (low) {
      priorities.push({
        id: "quota", kind: "quota",
        title: `Nur noch ${remaining} Matches übrig`,
        subtitle: "Kontingent läuft zur Neige",
        href: "/subscription",
      })
    }
    if (queuedCount > 0) {
      priorities.push({
        id: "queued", kind: "queued",
        title: `${queuedCount} ${queuedCount === 1 ? "Bewerbung wartet" : "Bewerbungen warten"}`,
        subtitle: "In Warteschlange bis Kontingent frei ist",
        href: "/subscription",
      })
    }
    if (reviewCount > 0) {
      priorities.push({
        id: "review", kind: "review",
        title: `${reviewCount} ${reviewCount === 1 ? "Kandidat" : "Kandidaten"} in Bewertung`,
        subtitle: "Analyse läuft oder wartet auf Start",
        href: "/candidates",
      })
    }
    if (unassignedCount > 0) {
      priorities.push({
        id: "inbox", kind: "inbox",
        title: `${unassignedCount} nicht zugeordnet`,
        subtitle: "Bewerbungen im Posteingang zuweisen",
        href: "/inbox",
      })
    }
    priorities = priorities.slice(0, 5)

    // Recent jobs with real candidate count + top match score
    const jobsList = jobsListRes.data || []
    const jobIds = jobsList.map((j) => j.id)

    let linksByJob: Record<string, number[]> = {}
    if (jobIds.length > 0) {
      const { data: links } = await supabase
        .from("job_candidates")
        .select("job_id, match_score")
        .eq("user_id", user.id)
        .in("job_id", jobIds)

      linksByJob = (links || []).reduce((acc, link) => {
        const id = link.job_id as string
        if (!acc[id]) acc[id] = []
        acc[id].push((link.match_score as number) ?? 0)
        return acc
      }, {} as Record<string, number[]>)
    }

    recentJobs = jobsList.map((job) => {
      const scoresForJob = linksByJob[job.id] || []
      return {
        id: job.id,
        title: job.title || "Unbenannter Job",
        company: job.company || "—",
        status: job.is_active ? "active" : "draft",
        candidates: scoresForJob.length,
        topScore: scoresForJob.length > 0 ? Math.max(...scoresForJob) : 0,
        createdAt: timeAgo(job.created_at),
      }
    })
  }

  return (
    <div className="relative min-h-full">
      <MatchBackfillTrigger />

      <RevealGroup className="relative z-[1] space-y-6 p-6 lg:p-8">
        {/* Light greeting + primary actions */}
        <DashboardHero firstName={firstName} />

        {/* Big-number KPI tiles (staggered reveal) */}
        <DashboardMetrics data={metricsData} />

        {/* Score gauge · segmented quota · dark priorities focus card */}
        <div className="reveal grid gap-4 lg:grid-cols-3">
          <ScoreGauge score={metricsData.avgMatchScore} scoredCount={metricsData.scoredCount} />
          <QuotaProgress used={metricsData.matchesUsed} total={metricsData.matchesLimit} />
          <Priorities items={priorities} />
        </div>

        {/* Recent activity */}
        <RecentActivity jobs={recentJobs} className="reveal" />
      </RevealGroup>
    </div>
  )
}
