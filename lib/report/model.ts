// ─────────────────────────────────────────────────────────────────────────────
// Revetly Report: Datenmodell und reine Helfer (ohne Server-Abhängigkeiten).
//
// Ein PDF-Profil pro Kandidat oder eine Shortlist mit mehreren. Zwei
// Varianten:
//   Standard  mit Name, Kontaktdaten und Foto.
//   Anonym    ohne all das. Der Name wird auch in den KI-Texten durch eine
//             Profilnummer ersetzt, E-Mail-Adressen, Telefonnummern und Links
//             verschwinden aus allen Texten, der Ort wird auf die Stadt
//             gekürzt. Frühere Arbeitgeber bleiben stehen, weil sie für den
//             Kunden wichtig sind. Der Export-Dialog weist darauf hin.
//
// Bewusst NICHT im Report, auch nicht in der Standard-Variante: Lücken im
// Lebenslauf, Auffälligkeiten aus dem Dossier und der Abgleich des
// Anschreibens. Das sind interne Prüfhinweise für das Gespräch, keine
// Aussagen für Dritte.
// ─────────────────────────────────────────────────────────────────────────────

export const REPORT_MAX_CANDIDATES = 10

export type ReportSection = "match" | "strengths" | "questions" | "interview"

export const REPORT_SECTIONS: Array<{ key: ReportSection; label: string; hint: string }> = [
  { key: "match", label: "Match mit den neun Ebenen", hint: "Gesamtwert, Balken pro Ebene, kurze Begründung, Prognose" },
  { key: "strengths", label: "Stärken und Skills", hint: "Was passt, Kurzprofil, Werdegang, Skills, Ausbildung, Sprachen" },
  { key: "questions", label: "Interviewfragen", hint: "Die Fragen aus dem Leitfaden, sofern einer erstellt wurde" },
  { key: "interview", label: "Interview-Ergebnis", hint: "Punkte pro Frage und Notizen, sofern das Gespräch bewertet ist" },
]

export const CATEGORIES: Array<{ column: string; detailKey: string; label: string }> = [
  { column: "hard_skills_score", detailKey: "hardSkills", label: "Hard Skills" },
  { column: "experience_score", detailKey: "experience", label: "Berufserfahrung" },
  { column: "education_score", detailKey: "education", label: "Ausbildung" },
  { column: "soft_skills_score", detailKey: "softSkills", label: "Soft Skills" },
  { column: "languages_score", detailKey: "languages", label: "Sprachen" },
  { column: "location_score", detailKey: "location", label: "Standort" },
  { column: "industry_score", detailKey: "industry", label: "Branche" },
  { column: "salary_score", detailKey: "salary", label: "Gehalt" },
  { column: "culture_score", detailKey: "culture", label: "Kultur" },
]

export interface ReportCandidate {
  /** Anzeigename: echter Name oder Profilnummer. */
  title: string
  code: string
  headline: string | null
  location: string | null
  years: number | null
  level: string | null
  email: string | null
  phone: string | null
  photo: Buffer | null
  score: number | null
  knockout: boolean
  knockoutReasons: string[]
  categories: Array<{ label: string; score: number | null; reason: string | null }>
  strengths: string[]
  summary: string | null
  prognosis: string | null
  stations: Array<{ role: string; company: string; period: string }>
  skills: string[]
  education: string[]
  certifications: string[]
  languages: Array<{ language: string; level: string }>
  questions: Array<{ competency: string; question: string }>
  interview: {
    score: number | null
    ratings: Array<{ question: string; rating: number | null; notes: string | null }>
    notes: string | null
  } | null
}

export interface ReportData {
  anonymous: boolean
  sections: Record<ReportSection, boolean>
  jobTitle: string
  jobLocation: string | null
  /** Firma, die den Report erstellt (Personalberatung oder HR). */
  issuer: string
  logo: Buffer | null
  createdAt: Date
  candidates: ReportCandidate[]
}

// ── Prüfung der Anfrage ──────────────────────────────────────────────────────

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface ReportRequest {
  jobId: string
  jobCandidateIds: string[]
  anonymous: boolean
  sections: Record<ReportSection, boolean>
}

export function parseReportRequest(body: unknown): { ok: true; value: ReportRequest } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>
  if (typeof b.jobId !== "string" || !UUID.test(b.jobId)) return { ok: false, error: "Keine Stelle angegeben." }
  const ids = Array.isArray(b.jobCandidateIds)
    ? [...new Set(b.jobCandidateIds.filter((x): x is string => typeof x === "string" && UUID.test(x)))]
    : []
  if (ids.length === 0) return { ok: false, error: "Wähle mindestens einen Kandidaten aus." }
  if (ids.length > REPORT_MAX_CANDIDATES) return { ok: false, error: `Höchstens ${REPORT_MAX_CANDIDATES} Kandidaten pro Report.` }
  const raw = (b.sections ?? {}) as Record<string, unknown>
  const sections = Object.fromEntries(
    REPORT_SECTIONS.map((s) => [s.key, raw[s.key] === undefined ? true : raw[s.key] === true]),
  ) as Record<ReportSection, boolean>
  if (!Object.values(sections).some(Boolean)) return { ok: false, error: "Wähle mindestens einen Inhalt aus." }
  return { ok: true, value: { jobId: b.jobId, jobCandidateIds: ids, anonymous: b.anonymous === true, sections } }
}

// ── Anonymisierung ───────────────────────────────────────────────────────────

/** Feste Profilnummer aus der Bewerbung, damit derselbe Kandidat immer gleich heißt. */
export function profileCode(jobCandidateId: string): string {
  return `K-${jobCandidateId.replace(/[^0-9a-f]/gi, "").slice(0, 4).toUpperCase()}`
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Entfernt Personenbezug aus einem Text: den Namen (ganz und in Teilen, auch
 * mit Genitiv-s), E-Mail-Adressen, Telefonnummern und Links. Lieber einmal zu
 * viel ersetzt als einmal zu wenig.
 */
export function scrubText(text: string, fullName: string | null, code: string): string {
  let out = text
  out = out.replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "[E-Mail entfernt]")
  out = out.replace(/\b(?:https?:\/\/|www\.)\S+/gi, "[Link entfernt]")
  out = out.replace(/\blinkedin\.com\/\S+/gi, "[Link entfernt]")
  out = out.replace(/(?:\+|\b0)\d[\d\s/().-]{6,}\d/g, (m) => (m.replace(/\D/g, "").length >= 9 ? "[Telefon entfernt]" : m))

  const name = fullName?.trim()
  if (name) {
    const parts = [name, ...name.split(/\s+/)].filter((p) => p.replace(/\./g, "").length >= 2)
    // Längste zuerst, damit "Lena Maier" vor "Lena" ersetzt wird.
    for (const p of [...new Set(parts)].sort((a, b) => b.length - a.length)) {
      const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(p)}s?(?![\\p{L}\\p{N}])`, "giu")
      out = out.replace(re, code)
    }
    // "K-1A2B K-1A2B" nach dem Ersetzen von Vor- und Nachnamen zusammenziehen.
    out = out.replace(new RegExp(`${escapeRegExp(code)}(\\s+${escapeRegExp(code)})+`, "g"), code)
  }
  return out
}

/** Ort ohne Straße und Postleitzahl: "Musterstraße 5, 8010 Graz" → "Graz". */
export function coarseLocation(location: string | null): string | null {
  if (!location?.trim()) return null
  const parts = location.split(",").map((p) => p.trim()).filter(Boolean)
  const last = (parts.length > 1 ? parts[parts.length - 1] : parts[0]) ?? ""
  const city = last.replace(/\b\d{4,5}\b/g, "").replace(/\s+/g, " ").trim()
  // Steht nur eine Straße mit Hausnummer da, bleibt nichts übrig.
  if (!city || /\d/.test(city)) return null
  return city
}

// ── Aufbereitung einer Bewerbung ─────────────────────────────────────────────

type Row = Record<string, unknown>

function one<T>(v: T | T[] | null | undefined): T | null {
  return (Array.isArray(v) ? v[0] : v) ?? null
}
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null)
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null)
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x.trim()) : [])

const LEVEL: Record<string, string> = {
  grundkenntnisse: "Grundkenntnisse",
  gut: "gut",
  fliessend: "fließend",
  verhandlungssicher: "verhandlungssicher",
  muttersprache: "Muttersprache",
  unbekannt: "",
}

function period(from: unknown, to: unknown): string {
  const f = str(from)?.slice(0, 7).replace(/^(\d{4})-(\d{2})$/, "$2/$1") ?? ""
  const tRaw = str(to) ?? ""
  const t = /heute/i.test(tRaw) ? "heute" : tRaw.slice(0, 7).replace(/^(\d{4})-(\d{2})$/, "$2/$1")
  return [f, t].filter(Boolean).join(" bis ")
}

/**
 * Baut aus einer Zeile von job_candidates (mit candidate) die Daten für den
 * Report. Rein und testbar; Foto kommt getrennt dazu.
 */
export function buildReportCandidate(row: Row, anonymous: boolean): ReportCandidate {
  const cand = one(row.candidate as Row | Row[] | null) ?? {}
  const detail = (row.match_detail ?? {}) as { categories?: Record<string, { begruendung?: unknown }> }
  const dossier = (cand.dossier ?? {}) as Row
  const guide = (row.interview_guide ?? null) as { questions?: Array<{ competency?: unknown; question?: unknown }> } | null
  const ratings = Array.isArray(row.interview_ratings) ? (row.interview_ratings as Row[]) : []

  const fullName = str(cand.full_name)
  const code = profileCode(String(row.id ?? ""))
  const clean = (s: string | null): string | null => (s && anonymous ? scrubText(s, fullName, code) : s)
  const cleanAll = (list: string[]) => list.map((s) => clean(s) as string)

  const dossierSkills = Array.isArray(dossier.skills) ? (dossier.skills as Row[]) : []
  const ranked = [
    ...dossierSkills.filter((s) => s.depth === "vertieft"),
    ...dossierSkills.filter((s) => s.depth === "angewendet"),
  ].map((s) => str(s.skill)).filter((s): s is string => !!s)
  const skills = [...new Set([...ranked, ...strs(cand.skills)])].slice(0, 14)

  const education = strs(dossier.education)
  const interviewScore = num(row.interview_score)
  const hasRatings = ratings.some((r) => typeof r.rating === "number")

  return {
    title: anonymous ? `Profil ${code}` : fullName ?? "Ohne Namen",
    code,
    headline: clean(str(cand.job_title)),
    // Auch im Standard-Report nur die Stadt: Die Wohnadresse braucht der Kunde nicht.
    location: coarseLocation(str(cand.location)),
    years: num(cand.years_of_experience) ?? num(dossier.totalYearsExperience),
    level: str(cand.experience_level),
    email: anonymous ? null : str(cand.email),
    phone: anonymous ? null : str(cand.phone),
    photo: null,
    score: num(row.match_score) != null ? Math.round(num(row.match_score)!) : null,
    knockout: row.knockout === true,
    knockoutReasons: cleanAll(strs(row.knockout_reasons)),
    categories: CATEGORIES.map((c) => ({
      label: c.label,
      score: num(row[c.column]) != null ? Math.round(num(row[c.column])!) : null,
      reason: clean(str(detail.categories?.[c.detailKey]?.begruendung)),
    })),
    strengths: cleanAll(
      (str(row.ai_summary) ?? "").split("|").map((s) => s.trim()).filter(Boolean).slice(0, 4),
    ),
    summary: clean(str(cand.summary_ai) ?? str(dossier.summary)),
    prognosis: clean(str(row.career_prognosis)),
    stations: (Array.isArray(dossier.stations) ? (dossier.stations as Row[]) : []).slice(0, 6).map((s) => ({
      role: clean(str(s.role)) ?? "",
      company: clean(str(s.company)) ?? "",
      period: period(s.from, s.to),
    })).filter((s) => s.role || s.company),
    skills: cleanAll(skills),
    education: cleanAll(education.length ? education : strs([cand.education])),
    certifications: cleanAll(strs(dossier.certifications).slice(0, 6)),
    languages: (Array.isArray(dossier.languages) ? (dossier.languages as Row[]) : [])
      .map((l) => ({ language: str(l.language) ?? "", level: LEVEL[String(l.level)] ?? "" }))
      .filter((l) => l.language),
    questions: (guide?.questions ?? [])
      .map((q) => ({ competency: clean(str(q.competency)) ?? "", question: clean(str(q.question)) ?? "" }))
      .filter((q) => q.question),
    interview: interviewScore != null || hasRatings
      ? {
          score: interviewScore != null ? Math.round(interviewScore) : null,
          ratings: ratings
            .map((r) => ({
              question: clean(str(r.question)) ?? "",
              rating: num(r.rating),
              notes: clean(str(r.notes)),
            }))
            .filter((r) => r.question),
          notes: clean(str(row.interview_notes)),
        }
      : null,
  }
}

/** Reihenfolge im Report: bester Match zuerst, ohne Match ans Ende. */
export function rankCandidates<T extends { score: number | null; knockout: boolean }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    if (a.knockout !== b.knockout) return a.knockout ? 1 : -1
    return (b.score ?? -1) - (a.score ?? -1)
  })
}

/** Dateiname ohne Sonderzeichen, etwa "Revetly-Report-Kfz-Mechatroniker-2026-10-03.pdf". */
export function reportFileName(jobTitle: string, date: Date, anonymous: boolean): string {
  const slug = jobTitle
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50) || "Stelle"
  return `Revetly-Report-${slug}${anonymous ? "-anonym" : ""}-${date.toISOString().slice(0, 10)}.pdf`
}
