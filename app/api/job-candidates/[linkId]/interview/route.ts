import { createClient } from "@/lib/supabase/server"
import { NextRequest, after } from "next/server"
import { createClient as createAdmin } from "@supabase/supabase-js"
import { generateInterviewGuide } from "@/lib/interview/guide"
import { recordTrainingExample, buildJudgeExample } from "@/lib/training/collect"
import { renderDossier } from "@/lib/matching/dossier"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const MISSING_COL =
  "Interview-Funktion noch nicht aktiv — bitte Migration 020_interview_guide.sql in Supabase ausführen."

function isMissingColumn(msg?: string | null): boolean {
  return /interview_(guide|ratings|score|notes|completed_at)/i.test(msg || "")
}

// Loads the owner's link with everything needed for the interview flow.
// match_detail (migration 021) is tried first and dropped gracefully.
async function loadLink(supabase: Awaited<ReturnType<typeof createClient>>, linkId: string, userId: string) {
  const base =
    "id, user_id, job_id, candidate_id, " +
    "hard_skills_score, experience_score, education_score, soft_skills_score, languages_score, " +
    "location_score, industry_score, salary_score, culture_score, career_prognosis, ai_summary, " +
    "interview_guide, interview_ratings, interview_score, interview_notes, interview_completed_at"

  let { data, error } = await supabase
    .from("job_candidates")
    .select(`${base}, match_detail`)
    .eq("id", linkId)
    .eq("user_id", userId)
    .single()
  if (error && /match_detail/i.test(error.message || "")) {
    ;({ data, error } = await supabase
      .from("job_candidates")
      .select(base)
      .eq("id", linkId)
      .eq("user_id", userId)
      .single())
  }
  return { data, error }
}

// GET — current guide + ratings (or nulls). Never fails on a pending migration.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ linkId: string }> }) {
  try {
    const { linkId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

    const { data, error } = await loadLink(supabase, linkId, user.id)
    if (error && isMissingColumn(error.message)) {
      return Response.json({ guide: null, ratings: null, score: null, notes: null, completedAt: null, needsMigration: true })
    }
    if (error || !data) return Response.json({ error: "Nicht gefunden" }, { status: 404 })

    return Response.json({
      guide: data.interview_guide ?? null,
      ratings: data.interview_ratings ?? null,
      score: data.interview_score ?? null,
      notes: data.interview_notes ?? null,
      completedAt: data.interview_completed_at ?? null,
    })
  } catch (error) {
    console.error("[interview GET] error:", error)
    return Response.json({ error: "Interner Serverfehler" }, { status: 500 })
  }
}

// POST — generate a structured interview guide from the score's weak areas.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ linkId: string }> }) {
  try {
    const { linkId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

    const { data: link, error: linkErr } = await loadLink(supabase, linkId, user.id)
    if (linkErr && isMissingColumn(linkErr.message)) {
      return Response.json({ error: MISSING_COL }, { status: 400 })
    }
    if (linkErr || !link) return Response.json({ error: "Nicht gefunden" }, { status: 404 })

    const [{ data: candidate }, { data: job }] = await Promise.all([
      supabase.from("candidates").select("*").eq("id", link.candidate_id).single(),
      supabase.from("jobs").select("*").eq("id", link.job_id).single(),
    ])
    if (!candidate || !job) return Response.json({ error: "Kandidat oder Job fehlt" }, { status: 404 })

    const guide = await generateInterviewGuide(candidate, job, link)

    const { error: upErr } = await supabase
      .from("job_candidates")
      .update({ interview_guide: guide })
      .eq("id", linkId)
      .eq("user_id", user.id)
    if (upErr) {
      if (isMissingColumn(upErr.message)) return Response.json({ error: MISSING_COL }, { status: 400 })
      return Response.json({ error: upErr.message }, { status: 500 })
    }

    return Response.json({ guide })
  } catch (error) {
    console.error("[interview POST] error:", error)
    return Response.json({ error: "Leitfaden konnte nicht erstellt werden" }, { status: 500 })
  }
}

// PUT — save the recruiter's ratings; compute a 0-100 interview score.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ linkId: string }> }) {
  try {
    const { linkId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

    const body = await req.json()
    const ratings: { competency?: string; question?: string; rating?: number; notes?: string }[] =
      Array.isArray(body.ratings) ? body.ratings : []
    const notes: string | null = typeof body.notes === "string" ? body.notes : null

    // Average of the given 1–5 ratings → 0-100 (null if nothing rated yet).
    const valid = ratings.map((r) => Number(r.rating)).filter((n) => Number.isFinite(n) && n >= 1 && n <= 5)
    const interviewScore = valid.length
      ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 20)
      : null

    // Ownership check.
    const { data: owns } = await supabase
      .from("job_candidates").select("id").eq("id", linkId).eq("user_id", user.id).single()
    if (!owns) return Response.json({ error: "Nicht gefunden" }, { status: 404 })

    const { error } = await supabase
      .from("job_candidates")
      .update({
        interview_ratings: ratings,
        interview_score: interviewScore,
        interview_notes: notes,
        interview_completed_at: valid.length ? new Date().toISOString() : null,
      })
      .eq("id", linkId)
      .eq("user_id", user.id)
    if (error) {
      if (isMissingColumn(error.message)) return Response.json({ error: MISSING_COL }, { status: 400 })
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Ein abgeschlossenes strukturiertes Interview ist ein MENSCHLICHES Urteil
    // — das wertvollste Trainingssignal, das Revetly erzeugt. Sammeln läuft
    // nur mit Einwilligung, pseudonymisiert und strikt best-effort.
    if (interviewScore != null) {
      after(async () => {
        try {
          await collectInterviewExample(linkId, user.id, interviewScore, notes)
        } catch (err) {
          console.error("[interview] Trainingsbeispiel übersprungen:", err)
        }
      })
    }

    return Response.json({ score: interviewScore })
  } catch (error) {
    console.error("[interview PUT] error:", error)
    return Response.json({ error: "Bewertung konnte nicht gespeichert werden" }, { status: 500 })
  }
}

/**
 * Baut aus einem abgeschlossenen Interview ein Trainingsbeispiel für den
 * Richter: Eingabe = das, was das Matching wusste; Ziel = das, was der Mensch
 * nach dem Gespräch entschieden hat. Läuft ausschließlich mit Einwilligung.
 */
async function collectInterviewExample(
  linkId: string,
  userId: string,
  interviewScore: number,
  notes: string | null,
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return
  const admin = createAdmin(url, key, { auth: { persistSession: false } })

  const { data: link } = await admin
    .from("job_candidates")
    .select("id, status, match_detail, job:jobs(title, company, required_skills, years_experience, description), candidate:candidates(full_name, dossier)")
    .eq("id", linkId)
    .single()
  if (!link) return

  const one = <T,>(v: unknown): T => (Array.isArray(v) ? v[0] : v) as T
  const job = one<{ title?: string; company?: string; required_skills?: string[]; years_experience?: string; description?: string }>(link.job) || {}
  const candidate = one<{ full_name?: string; dossier?: unknown }>(link.candidate) || {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dossier = candidate.dossier as any
  if (!dossier) return // ohne Dossier fehlt die Eingabeseite des Beispiels

  const detail = link.match_detail as { hardFacts?: unknown } | null
  const hardFactsText = detail?.hardFacts ? JSON.stringify(detail.hardFacts) : "Keine Hard Facts gespeichert"
  const jobText = [
    "=== STELLE ===",
    `Titel: ${job.title ?? "—"}`,
    `Muss-Skills: ${(job.required_skills || []).join(", ") || "—"}`,
    `Erfahrung: ${job.years_experience ?? "—"}`,
    `Beschreibung: ${(job.description || "").slice(0, 1500)}`,
  ].join("\n")

  const outcome: "eingestellt" | "abgesagt" | "interviewt" =
    link.status === "Eingestellt" ? "eingestellt" : link.status === "Abgesagt" ? "abgesagt" : "interviewt"

  const names = [candidate.full_name, job.company]
  const example = buildJudgeExample({
    dossierText: renderDossier(dossier),
    hardFactsText,
    jobText,
    interviewScore,
    interviewNotes: notes,
    outcome,
    names,
  })

  await recordTrainingExample(admin, {
    userId,
    task: "judge",
    labelSource: "interview",
    labelStrength: interviewScore,
    jobCandidateId: linkId,
    names,
    ...example,
  })
}
