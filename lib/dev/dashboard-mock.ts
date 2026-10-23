import type { DashboardViewData } from "@/components/dashboard/dashboard-view"
import type { UserProfile } from "@/components/app-topbar"
import { PLANS } from "@/lib/plans"

// ─────────────────────────────────────────────────────────────────────────────
// Beispieldaten für die Entwicklungsvorschau des Dashboards
// (app/dev/dashboard-preview), etwa für Aufnahmen im Produktvideo.
//
// Alle Personen, Firmen und Zahlen sind erfunden. Kontingent und Plan kommen
// aus PLANS, damit das Video nichts zeigt, was der Plan nicht hergibt.
// ─────────────────────────────────────────────────────────────────────────────

const PLAN = PLANS.growth

export const PREVIEW_USER: UserProfile = {
  first_name: "Lisa",
  last_name: "Hofer",
  email: "lisa.hofer@beispiel.at",
  matches_used: 184,
  matches_limit: PLAN.matches,
  plan: "growth",
}

const JOBS = [
  { id: "demo-job-1", title: "Kfz-Mechatroniker:in", company: "Autohaus Steiner" },
  { id: "demo-job-2", title: "Pflegefachkraft (DGKP)", company: "Seniorenresidenz Am Park" },
  { id: "demo-job-3", title: "Projektleiter:in Elektrotechnik", company: "Gruber Elektro" },
  { id: "demo-job-4", title: "Buchhalter:in Teilzeit", company: "Huber & Partner" },
] as const

export const PREVIEW_DASHBOARD: DashboardViewData = {
  firstName: PREVIEW_USER.first_name,
  metrics: {
    activeJobs: 4,
    newJobsThisWeek: 1,
    totalCandidates: 137,
    newCandidatesThisMonth: 42,
    matchesUsed: PREVIEW_USER.matches_used,
    matchesLimit: PLAN.matches,
    activeJobsLimit: PLAN.active_jobs,
    avgMatchScore: 71,
    scoredCount: 118,
  },
  pipeline: { scored: 74, invited: 23, waiting: 9, rejected: 31 },
  quotaPeriod: "monthly",
  priorities: [
    { id: "interview", kind: "interview", title: "3 Interviews auszuwerten", subtitle: "Eingeladene Kandidaten strukturiert bewerten", href: "/jobs" },
    { id: "review", kind: "review", title: "5 Kandidaten in Analyse", subtitle: "Analyse läuft oder wartet auf Start", href: "/candidates" },
    { id: "inbox", kind: "inbox", title: "2 nicht zugeordnet", subtitle: "Bewerbungen im Posteingang zuweisen", href: "/inbox" },
  ],
  recentApplications: [
    { id: "demo-app-1", candidateName: "Jonas Leitner", photoUrl: null, jobId: JOBS[0].id, jobTitle: JOBS[0].title, source: "public_page", matchScore: 91, timeAgo: "vor 12 Minuten" },
    { id: "demo-app-2", candidateName: "Sarah Pichler", photoUrl: null, jobId: JOBS[1].id, jobTitle: JOBS[1].title, source: "email", matchScore: 84, timeAgo: "vor 1 Stunde" },
    { id: "demo-app-3", candidateName: "Mehmet Yilmaz", photoUrl: null, jobId: JOBS[2].id, jobTitle: JOBS[2].title, source: "public_page", matchScore: 77, timeAgo: "vor 3 Stunden" },
    { id: "demo-app-4", candidateName: "Katharina Wolf", photoUrl: null, jobId: JOBS[3].id, jobTitle: JOBS[3].title, source: "manual", matchScore: 63, timeAgo: "vor 5 Stunden" },
    { id: "demo-app-5", candidateName: "David Brunner", photoUrl: null, jobId: JOBS[0].id, jobTitle: JOBS[0].title, source: "email", matchScore: null, timeAgo: "gerade eben" },
  ],
  topCandidates: [
    { id: "demo-top-1", candidateName: "Jonas Leitner", photoUrl: null, jobId: JOBS[0].id, jobTitle: JOBS[0].title, matchScore: 91 },
    { id: "demo-top-2", candidateName: "Elena Novak", photoUrl: null, jobId: JOBS[1].id, jobTitle: JOBS[1].title, matchScore: 88 },
    { id: "demo-top-3", candidateName: "Sarah Pichler", photoUrl: null, jobId: JOBS[1].id, jobTitle: JOBS[1].title, matchScore: 84 },
    { id: "demo-top-4", candidateName: "Lukas Mayr", photoUrl: null, jobId: JOBS[2].id, jobTitle: JOBS[2].title, matchScore: 81 },
    { id: "demo-top-5", candidateName: "Mehmet Yilmaz", photoUrl: null, jobId: JOBS[2].id, jobTitle: JOBS[2].title, matchScore: 77 },
  ],
  kpis: {
    weekCount: 18,
    prevWeekCount: 13,
    inviteRate: 18,
    perJob: 34.3,
    timeToInterviewDays: 2.4,
    sources: { public_page: 71, email: 48, manual: 18 },
  },
  kpisLocked: false,
  recentJobs: [
    { id: JOBS[0].id, title: JOBS[0].title, company: JOBS[0].company, status: "active", candidates: 46, topScore: 91, createdAt: "vor 2 Tagen" },
    { id: JOBS[1].id, title: JOBS[1].title, company: JOBS[1].company, status: "active", candidates: 39, topScore: 88, createdAt: "vor 5 Tagen" },
    { id: JOBS[2].id, title: JOBS[2].title, company: JOBS[2].company, status: "active", candidates: 31, topScore: 81, createdAt: "vor 1 Woche" },
    { id: JOBS[3].id, title: JOBS[3].title, company: JOBS[3].company, status: "draft", candidates: 21, topScore: 72, createdAt: "vor 2 Wochen" },
  ],
  qualityReport: {
    decisions: 54,
    scored: 118,
    liftVsAvg: 2.1,
    liftVsLow: 3.4,
    inviteRateByBand: {
      high: { n: 29, invited: 14, rate: 14 / 29 },
      mid: { n: 47, invited: 7, rate: 7 / 47 },
      low: { n: 42, invited: 2, rate: 2 / 42 },
    },
    interviewCorrelation: { n: 17, r: 0.62 },
    weightsApplied: true,
  },
}
