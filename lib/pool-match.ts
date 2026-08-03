// Lightweight, deterministic candidate↔job matching used to surface promising
// people from the existing talent pool when a new job is created. This is a
// CHEAP pre-selection over structured fields — no AI, no match-quota — so it can
// run over the whole pool for free. The real IMLRS score is computed only when
// the recruiter actually adds a suggested candidate to the job.

export interface PoolMatchCandidate {
  skills?: string[] | null
  years_of_experience?: number | null
  education?: string | null
  location?: string | null
}

export interface PoolMatchJob {
  required_skills?: string[] | null
  nice_to_have_skills?: string[] | null
  years_experience?: string | null
  education?: string | null
  location?: string | null
}

export interface PoolMatchResult {
  /** 0–100 heuristic estimate (labelled "≈" in the UI; not the IMLRS score). */
  score: number
  /** Which of the job's required skills this candidate covers. */
  matchedSkills: string[]
  /** Required skills the candidate does not obviously have. */
  missingSkills: string[]
}

const norm = (s: string) => s.toLowerCase().trim()

// Loose skill match: exact, or one clearly contains the other (handles
// "React" ↔ "React.js", "AWS" ↔ "AWS Cloud", etc.). Returns the candidate skill
// that matched, or null.
function skillHit(candidateSkills: string[], target: string): string | null {
  const t = norm(target)
  if (!t) return null
  for (const c of candidateSkills) {
    const cn = norm(c)
    if (!cn) continue
    if (cn === t) return c
    if (t.length >= 3 && (cn.includes(t) || t.includes(cn))) return c
  }
  return null
}

// Smallest number found in a free-text requirement like "3-5 Jahre" → 3.
function parseMinYears(s?: string | null): number | null {
  if (!s) return null
  const nums = (s.match(/\d+/g) || []).map(Number).filter((n) => Number.isFinite(n))
  return nums.length ? Math.min(...nums) : null
}

function shareToken(a: string, b: string, minLen: number): boolean {
  const bn = norm(b)
  return norm(a)
    .split(/[\s,/•|–-]+/)
    .some((tok) => tok.length >= minLen && bn.includes(tok))
}

/**
 * Scores a pool candidate against a job using only structured fields.
 * Weighting roughly mirrors the IMLRS emphasis on hard skills + experience so
 * the pre-selection correlates with the eventual full score.
 */
export function poolMatchScore(candidate: PoolMatchCandidate, job: PoolMatchJob): PoolMatchResult {
  const candidateSkills = (candidate.skills || []).filter(Boolean)
  const required = (job.required_skills || []).filter(Boolean)
  const nice = (job.nice_to_have_skills || []).filter(Boolean)

  // --- Skills (core, 55%) ---
  const matchedSkills: string[] = []
  const missingSkills: string[] = []
  let requiredHits = 0
  for (const r of required) {
    if (skillHit(candidateSkills, r)) {
      requiredHits++
      matchedSkills.push(r)
    } else {
      missingSkills.push(r)
    }
  }
  let niceHits = 0
  for (const n of nice) if (skillHit(candidateSkills, n)) niceHits++

  let skillsScore: number
  if (required.length > 0) {
    skillsScore = (requiredHits / required.length) * 100
    if (nice.length > 0) skillsScore = Math.min(100, skillsScore + (niceHits / nice.length) * 10)
  } else if (nice.length > 0) {
    skillsScore = (niceHits / nice.length) * 100
  } else {
    skillsScore = 60 // job lists no skills → neutral
  }

  // --- Experience (25%) ---
  const reqYears = parseMinYears(job.years_experience)
  const candYears = candidate.years_of_experience ?? null
  let expScore: number
  if (reqYears == null || candYears == null) expScore = 70
  else if (candYears >= reqYears) expScore = 100
  else expScore = Math.max(0, Math.round((candYears / Math.max(reqYears, 1)) * 100))

  // --- Location (10%) ---
  let locScore = 70
  if (job.location && candidate.location) {
    locScore = shareToken(job.location, candidate.location, 3) ? 100 : 45
  }

  // --- Education (10%) ---
  let eduScore = 70
  if (job.education && candidate.education) {
    eduScore = shareToken(job.education, candidate.education, 4) ? 100 : 55
  }

  const score = Math.round(skillsScore * 0.55 + expScore * 0.25 + locScore * 0.1 + eduScore * 0.1)
  return { score: Math.max(0, Math.min(100, score)), matchedSkills, missingSkills }
}
