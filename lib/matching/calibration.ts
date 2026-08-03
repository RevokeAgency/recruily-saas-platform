// Matching-Feedback-Loop: pure calibration maths (no I/O, fully testable).
//
// From a tenant's OWN decisions (invited / rejected / hired) we compute how
// well IMLRS scores predicted those decisions, and derive a carefully bounded
// per-tenant weight adjustment. Everything is aggregate statistics — no model
// is trained, no personal data leaves the tenant's rows (DSGVO), and every
// adjustment is deterministic and auditable (EU AI Act).

export const DEFAULT_WEIGHTS: Record<string, number> = {
  hardSkills: 0.25,
  experience: 0.2,
  education: 0.1,
  softSkills: 0.1,
  languages: 0.05,
  location: 0.05,
  industry: 0.1,
  salary: 0.05,
  culture: 0.1,
}

// DB column → weight key.
export const CATEGORY_COLUMNS: Record<string, string> = {
  hard_skills_score: "hardSkills",
  experience_score: "experience",
  education_score: "education",
  soft_skills_score: "softSkills",
  languages_score: "languages",
  location_score: "location",
  industry_score: "industry",
  salary_score: "salary",
  culture_score: "culture",
}

// A tenant needs at least this many decided candidates before weights move.
export const MIN_DECISIONS = 30
// A single weight may move at most this far from its default (5 pp).
export const MAX_WEIGHT_SHIFT = 0.05

const POSITIVE = new Set(["Eingeladen", "interviewed", "Eingestellt", "hired", "offered", "shortlisted"])
const NEGATIVE = new Set(["Abgesagt", "rejected"])

export interface CalibRow {
  match_score: number | null
  interview_score?: number | null
  status: string | null
  knockout?: boolean | null
  [categoryColumn: string]: unknown
}

export interface CalibrationReport {
  computedAt: string
  scored: number
  decisions: number
  invited: number
  inviteRateByBand: Record<"low" | "mid" | "high", { n: number; invited: number; rate: number | null }>
  /** How much more often 80+ candidates get invited vs the overall decided base rate. */
  liftVsAvg: number | null
  /** …vs the <60 band (the headline number when available). */
  liftVsLow: number | null
  interviewCorrelation: { n: number; r: number | null }
  categoryCorrelations: Record<string, number | null>
  koOverrides: { knockouts: number; invitedDespiteKo: number }
  weights: Record<string, number> | null
  weightsApplied: boolean
}

export function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length)
  if (n < 3) return null
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  let num = 0, dx = 0, dy = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my)
    dx += (xs[i] - mx) ** 2
    dy += (ys[i] - my) ** 2
  }
  if (dx === 0 || dy === 0) return null
  return num / Math.sqrt(dx * dy)
}

function outcomeOf(status: string | null): 1 | 0 | null {
  if (!status) return null
  if (POSITIVE.has(status)) return 1
  if (NEGATIVE.has(status)) return 0
  return null
}

/**
 * Bounded weight proposal from category↔decision correlations. Categories that
 * predict this tenant's decisions better than average gain weight (max +5 pp),
 * weaker predictors lose (max −5 pp); the sum is renormalised to 1.
 */
export function proposeWeights(
  categoryCorrelations: Record<string, number | null>,
  decisions: number,
): Record<string, number> | null {
  if (decisions < MIN_DECISIONS) return null
  const usable = Object.entries(categoryCorrelations).filter(([, r]) => typeof r === "number") as [string, number][]
  if (usable.length < 5) return null

  const keys = Object.keys(DEFAULT_WEIGHTS)
  const mean = usable.reduce((a, [, r]) => a + r, 0) / usable.length

  // Raw bounded shifts from correlation deltas …
  const shifts: Record<string, number> = {}
  for (const key of keys) {
    const r = categoryCorrelations[key]
    const delta = typeof r === "number" ? r - mean : 0
    shifts[key] = Math.max(-MAX_WEIGHT_SHIFT, Math.min(MAX_WEIGHT_SHIFT, 0.25 * delta))
  }
  // … centred so they sum to 0 (keeps the total at 1), then re-bounded.
  const shiftMean = keys.reduce((a, k) => a + shifts[k], 0) / keys.length
  const lo = (def: number) => Math.max(0.02, def - MAX_WEIGHT_SHIFT)
  const hi = (def: number) => def + MAX_WEIGHT_SHIFT
  const out: Record<string, number> = {}
  for (const key of keys) {
    const def = DEFAULT_WEIGHTS[key]
    out[key] = Math.min(hi(def), Math.max(lo(def), def + shifts[key] - shiftMean))
  }
  // Distribute any residual to weights that still have head-/footroom, so the
  // sum returns to 1 WITHOUT breaching the ±5 pp bound on any single weight.
  for (let i = 0; i < 4; i++) {
    const residual = 1 - keys.reduce((a, k) => a + out[k], 0)
    if (Math.abs(residual) < 1e-6) break
    const adjustable = keys.filter((k) =>
      residual > 0 ? out[k] < hi(DEFAULT_WEIGHTS[k]) - 1e-9 : out[k] > lo(DEFAULT_WEIGHTS[k]) + 1e-9,
    )
    if (adjustable.length === 0) break
    const per = residual / adjustable.length
    for (const k of adjustable) {
      const def = DEFAULT_WEIGHTS[k]
      out[k] = Math.min(hi(def), Math.max(lo(def), out[k] + per))
    }
  }
  for (const key of keys) out[key] = Math.round(out[key] * 10000) / 10000
  return out
}

/** Full calibration report for one tenant from their candidate/decision rows. */
export function computeCalibration(rows: CalibRow[], now = new Date()): CalibrationReport {
  const scoredRows = rows.filter((r) => typeof r.match_score === "number")
  const decided = scoredRows
    .map((r) => ({ row: r, outcome: outcomeOf(r.status) }))
    .filter((d): d is { row: CalibRow; outcome: 1 | 0 } => d.outcome !== null)

  const bandOf = (s: number) => (s >= 80 ? "high" : s >= 60 ? "mid" : "low") as "low" | "mid" | "high"
  const bands: CalibrationReport["inviteRateByBand"] = {
    low: { n: 0, invited: 0, rate: null },
    mid: { n: 0, invited: 0, rate: null },
    high: { n: 0, invited: 0, rate: null },
  }
  for (const d of decided) {
    const b = bands[bandOf(d.row.match_score as number)]
    b.n++
    b.invited += d.outcome
  }
  for (const b of Object.values(bands)) b.rate = b.n > 0 ? Math.round((b.invited / b.n) * 1000) / 1000 : null

  const overallRate = decided.length > 0 ? decided.filter((d) => d.outcome === 1).length / decided.length : null
  const round1 = (v: number) => Math.round(v * 10) / 10
  const liftVsAvg =
    bands.high.rate != null && overallRate != null && overallRate > 0 ? round1(bands.high.rate / overallRate) : null
  const liftVsLow =
    bands.high.rate != null && bands.low.rate != null && bands.low.rate > 0
      ? round1(bands.high.rate / bands.low.rate)
      : null

  // Category ↔ decision correlations (point-biserial via Pearson on 0/1).
  const categoryCorrelations: Record<string, number | null> = {}
  for (const [col, key] of Object.entries(CATEGORY_COLUMNS)) {
    const xs: number[] = []
    const ys: number[] = []
    for (const d of decided) {
      const v = d.row[col]
      if (typeof v === "number") {
        xs.push(v)
        ys.push(d.outcome)
      }
    }
    const r = pearson(xs, ys)
    categoryCorrelations[key] = r == null ? null : Math.round(r * 1000) / 1000
  }

  // Predicted vs measured: match_score ↔ structured interview score.
  const ivPairs = scoredRows.filter((r) => typeof r.interview_score === "number")
  const ivR = pearson(
    ivPairs.map((r) => r.match_score as number),
    ivPairs.map((r) => r.interview_score as number),
  )

  const knockouts = rows.filter((r) => r.knockout === true)
  const invitedDespiteKo = knockouts.filter((r) => outcomeOf(r.status) === 1).length

  const weights = proposeWeights(categoryCorrelations, decided.length)

  return {
    computedAt: now.toISOString(),
    scored: scoredRows.length,
    decisions: decided.length,
    invited: decided.filter((d) => d.outcome === 1).length,
    inviteRateByBand: bands,
    liftVsAvg,
    liftVsLow,
    interviewCorrelation: { n: ivPairs.length, r: ivR == null ? null : Math.round(ivR * 1000) / 1000 },
    categoryCorrelations,
    koOverrides: { knockouts: knockouts.length, invitedDespiteKo },
    weights,
    weightsApplied: weights != null,
  }
}
