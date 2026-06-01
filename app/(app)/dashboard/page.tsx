import { DashboardMetrics, type DashboardMetricsData } from "@/components/dashboard/metrics"
import { RecentActivity, type RecentJob } from "@/components/dashboard/recent-activity"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { QuotaProgress } from "@/components/dashboard/quota-progress"
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
    avgMatchScore: 0,
  }
  let recentJobs: RecentJob[] = []

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
      profileRes,
      matchScoresRes,
      jobsListRes,
    ] = await Promise.all([
      supabase.from("jobs").select("id", { count: "exact", head: true })
        .eq("is_active", true).eq("user_id", user.id),
      supabase.from("jobs").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).gte("created_at", weekAgo),
      supabase.from("candidates").select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase.from("candidates").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).gte("created_at", monthStart),
      supabase.from("user_profiles").select("matches_used, matches_limit")
        .eq("id", user.id).single(),
      supabase.from("job_candidates").select("match_score")
        .eq("user_id", user.id).not("match_score", "is", null),
      supabase.from("jobs").select("id, title, company, is_active, created_at")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
    ])

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
      matchesUsed: profileRes.data?.matches_used ?? 0,
      matchesLimit: profileRes.data?.matches_limit ?? 0,
      avgMatchScore,
    }

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
    <div className="p-8 lg:p-10 space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-slate-500 mt-1.5">
          Willkommen zurück! Hier ist deine Recruiting-Übersicht.
        </p>
      </div>

      {/* Metrics Grid */}
      <DashboardMetrics data={metricsData} />

      {/* Quota Progress */}
      <QuotaProgress used={metricsData.matchesUsed} total={metricsData.matchesLimit} />

      {/* Quick Actions */}
      <QuickActions />

      {/* Recent Activity */}
      <RecentActivity jobs={recentJobs} />
    </div>
  )
}
