import { generateStructured } from "@/lib/ai/generate"
import { z } from "zod"
import type { CareerDossier } from "./dossier"


// ─────────────────────────────────────────────────────────────────────────────
// IMLRS 2.0 — Stage B: deterministic hard facts.
//
// The maths never happens inside a judgment prompt. Skill coverage is resolved
// by a single temperature-0 mapping call (semantic: "Next.js" covers "React",
// with a written justification per pair), then coverage ratios, experience-
// years checks and language checks are computed in plain code. The result both
// feeds the judge as ground truth AND caps its scores afterwards — a candidate
// missing most required skills cannot be talked up to 85.
// ─────────────────────────────────────────────────────────────────────────────

const skillMatrixSchema = z.object({
  mappings: z.array(z.object({
    required: z.string().describe("Die geforderte Fähigkeit, exakt wie vorgegeben"),
    reasoning: z.string().describe("Kurze Begründung der Zuordnung (oder warum keine Deckung besteht)"),
    coveredBy: z.string().nullable().describe("Die Kandidaten-Fähigkeit, die diese Anforderung deckt — oder null, wenn keine sie deckt"),
    coverage: z.enum(["voll", "teilweise", "keine"]).describe("voll = direkt oder durch klar übergeordnete Fähigkeit gedeckt (Next.js→React); teilweise = verwandt/übertragbar; keine = nicht gedeckt"),
  })),
})

export interface SkillMapping {
  required: string
  reasoning: string
  coveredBy: string | null
  coverage: "voll" | "teilweise" | "keine"
}

export interface HardFacts {
  requiredSkillMappings: SkillMapping[]
  niceSkillMappings: SkillMapping[]
  /** 0–1: full hit = 1, partial = 0.5, weighted over required skills. */
  requiredCoverage: number | null
  requiredMinYears: number | null
  candidateYears: number | null
  /** null when either side is unknown. */
  experienceRatio: number | null
  languageChecks: { required: string; met: boolean | null; note: string }[]
  locationMatch: boolean | null
}

const norm = (s: string) => s.toLowerCase().trim()

/** Deterministic pre-pass: exact / substring skill hits need no AI at all. */
export function directSkillHit(candidateSkills: string[], required: string): string | null {
  const t = norm(required)
  if (!t) return null
  for (const c of candidateSkills) {
    const cn = norm(c)
    if (cn === t) return c
    if (t.length >= 3 && (cn.includes(t) || t.includes(cn))) return c
  }
  return null
}

/** Smallest number in a free-text requirement like "3-5 Jahre" → 3. */
export function parseMinYears(s?: string | null): number | null {
  if (!s) return null
  const nums = (s.match(/\d+/g) || []).map(Number).filter((n) => Number.isFinite(n) && n < 60)
  return nums.length ? Math.min(...nums) : null
}

/** Weighted coverage over required-skill mappings: voll=1, teilweise=0.5. */
export function coverageRatio(mappings: SkillMapping[]): number | null {
  if (mappings.length === 0) return null
  const sum = mappings.reduce(
    (acc, m) => acc + (m.coverage === "voll" ? 1 : m.coverage === "teilweise" ? 0.5 : 0),
    0,
  )
  return sum / mappings.length
}

/**
 * Deterministic score ceilings derived from hard facts. Applied in code AFTER
 * the judge — no prompt can override them.
 */
export function hardFactCaps(f: HardFacts): { hardSkillsCap: number; experienceCap: number } {
  let hardSkillsCap = 100
  if (f.requiredCoverage != null) {
    if (f.requiredCoverage < 0.34) hardSkillsCap = 40
    else if (f.requiredCoverage < 0.67) hardSkillsCap = 65
    else if (f.requiredCoverage < 1) hardSkillsCap = 88
  }
  let experienceCap = 100
  if (f.experienceRatio != null) {
    if (f.experienceRatio < 0.5) experienceCap = 40
    else if (f.experienceRatio < 0.8) experienceCap = 65
  }
  return { hardSkillsCap, experienceCap }
}

// Simple language matching against the dossier (deterministic).
function checkLanguages(
  requiredLanguages: string[],
  dossier: CareerDossier | null,
): HardFacts["languageChecks"] {
  return requiredLanguages.map((req) => {
    if (!dossier) return { required: req, met: null, note: "Kein Dossier — im Interview klären" }
    const reqName = norm(req).split(/[\s(]/)[0]
    const hit = dossier.languages.find((l) => {
      const ln = norm(l.language)
      return ln.includes(reqName) || reqName.includes(ln)
    })
    if (!hit) return { required: req, met: null, note: "Nicht im CV belegt — im Interview klären" }
    if (hit.level === "unbekannt") return { required: req, met: null, note: `${hit.language} vorhanden, Niveau unbelegt` }
    const strong = ["fliessend", "verhandlungssicher", "muttersprache"].includes(hit.level)
    const wantsStrong = /flie|verhandlung|mutter|c1|c2|native/i.test(req)
    return {
      required: req,
      met: wantsStrong ? strong : true,
      note: `${hit.language}: ${hit.level}`,
    }
  })
}

function tokenOverlap(a: string, b: string): boolean {
  const bn = norm(b)
  return norm(a).split(/[\s,/•|–-]+/).some((tok) => tok.length >= 3 && bn.includes(tok))
}

/**
 * Builds the full hard-facts block. One temperature-0 mapping call resolves
 * semantic skill coverage for skills that have no direct string hit; everything
 * else is plain code.
 */
export async function computeHardFacts(input: {
  dossier: CareerDossier | null
  candidateSkills: string[]
  candidateLocation?: string | null
  job: {
    required_skills?: string[] | null
    nice_to_have_skills?: string[] | null
    years_experience?: string | null
    languages?: string[] | null
    location?: string | null
  }
}): Promise<HardFacts> {
  const { dossier, job } = input
  // Prefer dossier skills (they carry evidence depth) merged with stored skills.
  const candidateSkills = Array.from(
    new Set([...(dossier?.skills.map((s) => s.skill) ?? []), ...input.candidateSkills]),
  ).filter(Boolean)

  const required = (job.required_skills || []).filter(Boolean)
  const nice = (job.nice_to_have_skills || []).filter(Boolean)

  // 1) Direct hits without AI.
  const resolve = (skill: string): SkillMapping | null => {
    const hit = directSkillHit(candidateSkills, skill)
    return hit
      ? { required: skill, coveredBy: hit, coverage: "voll", reasoning: "Direkte Übereinstimmung" }
      : null
  }
  const requiredDirect = new Map(required.map((s) => [s, resolve(s)]))
  const niceDirect = new Map(nice.map((s) => [s, resolve(s)]))
  const openRequired = required.filter((s) => !requiredDirect.get(s))
  const openNice = nice.filter((s) => !niceDirect.get(s))

  // 2) Semantic mapping for the rest — one deterministic call.
  let semantic = new Map<string, SkillMapping>()
  const open = [...openRequired, ...openNice]
  if (open.length > 0 && candidateSkills.length > 0) {
    try {
      const { output } = await generateStructured({
    task: "utility",
    label: "Skill-Deckung",
    schema: skillMatrixSchema,
        system:
          "Du prüfst semantische Skill-Deckung für Recruiting-Matching. Sei präzise und konservativ: " +
          "'voll' nur, wenn die Kandidaten-Fähigkeit die Anforderung fachlich klar einschließt (z. B. Next.js → React, PostgreSQL → SQL). " +
          "'teilweise' für verwandte, übertragbare Fähigkeiten. Sonst 'keine'. Begründung zuerst formulieren, dann entscheiden. Antworte auf Deutsch.",
        prompt: `Geforderte Fähigkeiten (einzeln prüfen):\n${open.map((s) => `- ${s}`).join("\n")}\n\nFähigkeiten des Kandidaten:\n${candidateSkills.map((s) => `- ${s}`).join("\n")}`,
      })
      if (output) semantic = new Map(output.mappings.map((m) => [m.required, m]))
    } catch (err) {
      console.error("[hard-facts] skill matrix failed (using direct hits only):", err)
    }
  }

  const finalize = (skill: string, direct: SkillMapping | null): SkillMapping =>
    direct ??
    semantic.get(skill) ?? {
      required: skill,
      coveredBy: null,
      coverage: "keine",
      reasoning: "Keine passende Fähigkeit gefunden",
    }

  const requiredSkillMappings = required.map((s) => finalize(s, requiredDirect.get(s) ?? null))
  const niceSkillMappings = nice.map((s) => finalize(s, niceDirect.get(s) ?? null))

  // 3) Pure-code checks.
  const requiredMinYears = parseMinYears(job.years_experience)
  const candidateYears = dossier?.totalYearsExperience ?? null
  const experienceRatio =
    requiredMinYears != null && candidateYears != null
      ? Math.min(candidateYears / Math.max(requiredMinYears, 0.5), 2)
      : null

  const locationMatch =
    job.location && input.candidateLocation
      ? tokenOverlap(job.location, input.candidateLocation) || /remote/i.test(job.location)
      : null

  return {
    requiredSkillMappings,
    niceSkillMappings,
    requiredCoverage: coverageRatio(requiredSkillMappings),
    requiredMinYears,
    candidateYears,
    experienceRatio,
    languageChecks: checkLanguages(job.languages || [], dossier),
    locationMatch,
  }
}

/** Deterministic text rendering of the hard facts for the judge prompt. */
export function renderHardFacts(f: HardFacts): string {
  const req = f.requiredSkillMappings
    .map((m) => `- ${m.required}: ${m.coverage.toUpperCase()}${m.coveredBy ? ` (durch ${m.coveredBy})` : ""} — ${m.reasoning}`)
    .join("\n")
  const nice = f.niceSkillMappings
    .map((m) => `- ${m.required}: ${m.coverage}${m.coveredBy ? ` (durch ${m.coveredBy})` : ""}`)
    .join("\n")
  const langs = f.languageChecks
    .map((l) => `- ${l.required}: ${l.met === true ? "erfüllt" : l.met === false ? "NICHT erfüllt" : "unklar"} (${l.note})`)
    .join("\n")
  return `SKILL-DECKUNG (deterministisch geprüft — bindend):
${req || "- keine Muss-Skills definiert"}
Deckungsgrad Muss-Skills: ${f.requiredCoverage == null ? "n/a" : Math.round(f.requiredCoverage * 100) + "%"}
NICE-TO-HAVE:
${nice || "- keine definiert"}
ERFAHRUNG: gefordert min. ${f.requiredMinYears ?? "?"} Jahre, belegt ${f.candidateYears ?? "?"} Jahre${f.experienceRatio != null ? ` (Erfüllung ${Math.round(f.experienceRatio * 100)}%)` : ""}
SPRACHEN:
${langs || "- keine gefordert"}
STANDORT: ${f.locationMatch === true ? "passend" : f.locationMatch === false ? "abweichend" : "unklar"}`
}
