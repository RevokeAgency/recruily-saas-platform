// ─────────────────────────────────────────────────────────────────────────────
// Freigabe-Link für Fachabteilungen: gemeinsame Typen und reine Helfer.
//
// HR schickt eine Auswahl von Bewerbern einer Stelle an jemanden im eigenen
// Unternehmen. Die Person sieht die Zusammenfassungen ohne Login und gibt pro
// Bewerber "Interessant" oder "Ablehnen" mit Kommentar ab. Das Urteil ist nur
// eine Rückmeldung an HR, es ändert keinen Status (Entscheidung des Inhabers,
// passt zur menschlichen Aufsicht nach KI-Verordnung).
//
// Keine Server-Abhängigkeiten, damit Oberfläche und Tests es nutzen können.
// ─────────────────────────────────────────────────────────────────────────────

export const REVIEW_MAX_CANDIDATES = 10
export const REVIEW_VALID_DAYS = 7
export const REVIEW_COMMENT_MAX = 1000
export const REVIEW_NOTE_MAX = 1000

export type ReviewVerdict = "interessant" | "ablehnen"

export const VERDICT_LABEL: Record<ReviewVerdict, string> = {
  interessant: "Interessant",
  ablehnen: "Ablehnen",
}

/** Was der Fachbereich zu einem Bewerber sieht. Bewusst ohne Kontaktdaten. */
export interface ReviewCandidateView {
  itemId: string
  name: string
  headline: string | null
  location: string | null
  years: number | null
  score: number | null
  knockout: boolean
  knockoutReasons: string[]
  strengths: string[]
  summary: string | null
  skills: string[]
  hasCv: boolean
  verdict: ReviewVerdict | null
  comment: string | null
  decidedAt: string | null
}

export type ReviewPageData =
  | {
      status: "ok"
      jobTitle: string
      company: string
      jobLocation: string | null
      reviewerName: string | null
      senderName: string
      note: string | null
      expiresAt: string
      candidates: ReviewCandidateView[]
    }
  | { status: "expired" | "revoked" | "not_found" }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID.test(v)
}

function clean(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null
  const t = v.trim().slice(0, max)
  return t || null
}

export interface CreateReviewInput {
  jobId: string
  jobCandidateIds: string[]
  reviewerName: string | null
  reviewerEmail: string | null
  note: string | null
}

/** Prüft die Anfrage zum Anlegen eines Links. Doppelte Bewerber zählen einmal. */
export function parseCreateReview(body: unknown): { ok: true; value: CreateReviewInput } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>
  if (!isUuid(b.jobId)) return { ok: false, error: "Keine Stelle angegeben." }
  const ids = Array.isArray(b.jobCandidateIds) ? [...new Set(b.jobCandidateIds.filter(isUuid))] : []
  if (ids.length === 0) return { ok: false, error: "Wähle mindestens einen Bewerber aus." }
  if (ids.length > REVIEW_MAX_CANDIDATES) {
    return { ok: false, error: `Höchstens ${REVIEW_MAX_CANDIDATES} Bewerber pro Link.` }
  }
  const email = clean(b.reviewerEmail, 254)
  if (email && !EMAIL.test(email)) return { ok: false, error: "Die E-Mail-Adresse sieht nicht gültig aus." }
  return {
    ok: true,
    value: {
      jobId: b.jobId,
      jobCandidateIds: ids,
      reviewerName: clean(b.reviewerName, 120),
      reviewerEmail: email,
      note: clean(b.note, REVIEW_NOTE_MAX),
    },
  }
}

/** Prüft ein Urteil des Fachbereichs. */
export function parseVerdict(body: unknown): { ok: true; itemId: string; verdict: ReviewVerdict; comment: string | null } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>
  if (!isUuid(b.itemId)) return { ok: false, error: "Bewerber fehlt." }
  if (b.verdict !== "interessant" && b.verdict !== "ablehnen") return { ok: false, error: "Bitte wähle Interessant oder Ablehnen." }
  return { ok: true, itemId: b.itemId, verdict: b.verdict, comment: clean(b.comment, REVIEW_COMMENT_MAX) }
}

type Row = Record<string, unknown>

function one<T>(v: T | T[] | null | undefined): T | null {
  return (Array.isArray(v) ? v[0] : v) ?? null
}

/**
 * Baut aus einer Zeile von review_link_items samt Bewerbung und Kandidat die
 * Ansicht für den Fachbereich. E-Mail, Telefon und Foto bleiben bewusst
 * draußen: Für ein Urteil zur Eignung braucht es sie nicht.
 */
export function toCandidateView(item: Row): ReviewCandidateView {
  const link = one(item.job_candidate as Row | Row[] | null) ?? {}
  const cand = one(link.candidate as Row | Row[] | null) ?? {}
  const detail = (link.match_detail ?? null) as { dossierSummary?: unknown } | null

  const strengths = typeof link.ai_summary === "string"
    ? link.ai_summary.split("|").map((s) => s.trim()).filter(Boolean).slice(0, 4)
    : []
  const dossier = typeof detail?.dossierSummary === "string" && !detail.dossierSummary.startsWith("Kein Dossier")
    ? detail.dossierSummary
    : null
  const summary = (typeof cand.summary_ai === "string" && cand.summary_ai.trim()) || dossier || null
  const verdict = item.verdict === "interessant" || item.verdict === "ablehnen" ? item.verdict : null

  return {
    itemId: String(item.id),
    name: (typeof cand.full_name === "string" && cand.full_name.trim()) || "Ohne Namen",
    headline: typeof cand.job_title === "string" ? cand.job_title : null,
    location: typeof cand.location === "string" ? cand.location : null,
    years: typeof cand.years_of_experience === "number" ? cand.years_of_experience : null,
    score: typeof link.match_score === "number" ? Math.round(link.match_score) : null,
    knockout: link.knockout === true,
    knockoutReasons: Array.isArray(link.knockout_reasons) ? (link.knockout_reasons as unknown[]).filter((r): r is string => typeof r === "string") : [],
    strengths,
    summary,
    skills: Array.isArray(cand.skills) ? (cand.skills as unknown[]).filter((s): s is string => typeof s === "string").slice(0, 12) : [],
    hasCv: typeof cand.resume_path === "string" && cand.resume_path.length > 0,
    verdict,
    comment: typeof item.comment === "string" ? item.comment : null,
    decidedAt: typeof item.decided_at === "string" ? item.decided_at : null,
  }
}

/** Zählt die Urteile eines Links. */
export function verdictCounts(items: Array<{ verdict: string | null }>): { interessant: number; ablehnen: number; offen: number } {
  let interessant = 0
  let ablehnen = 0
  for (const i of items) {
    if (i.verdict === "interessant") interessant++
    else if (i.verdict === "ablehnen") ablehnen++
  }
  return { interessant, ablehnen, offen: items.length - interessant - ablehnen }
}

/** Zustand eines Links aus Sicht von HR. */
export function linkState(link: { expires_at: string; revoked_at: string | null; completed_at?: string | null }, now = new Date()): "aktiv" | "abgelaufen" | "widerrufen" | "abgeschlossen" {
  if (link.revoked_at) return "widerrufen"
  if (link.completed_at) return "abgeschlossen"
  if (new Date(link.expires_at).getTime() <= now.getTime()) return "abgelaufen"
  return "aktiv"
}
