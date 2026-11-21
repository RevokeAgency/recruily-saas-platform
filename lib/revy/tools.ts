import type { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"
import { getMatchUsage } from "@/lib/quota"
import { linkCandidateToJob, scoreLinkInBackground } from "@/lib/matching/link"
import { ensureDocumentPages } from "./pages"

// ─────────────────────────────────────────────────────────────────────────────
// Werkzeugregister von Revy.
//
// Jedes Werkzeug hat eine feste Wirkungsklasse im Code. Kein Parameter, keine
// Einstellung und keine Modellausgabe ändert sie. Die Freigaberegel dazu
// steht an genau einer Stelle: lib/revy/gate.ts.
//
// Alle Werkzeuge lesen nur aus dem Schema revy (bereinigte Sichten, RLS mit
// der Sitzung des Nutzers). Die Service-Rolle kommt nur an zwei Stellen vor:
// Seitentext aus dem privaten Storage bauen (nach Sichtprüfung mit RLS) und
// das Matching im Hintergrund. tests/revy-core.test.ts prüft das im Quelltext.
//
// Parameter sind Whitelists: Kürzel im Format K-XXXXXXXX, UUIDs, kurze
// Suchbegriffe. Freie Abfragen gibt es nicht.
// ─────────────────────────────────────────────────────────────────────────────

export const EFFECTS = ["LESEND", "INTERN", "NACH_AUSSEN"] as const
export type Effect = (typeof EFFECTS)[number]

export const REF = z.string().regex(/^K-[0-9A-F]{8}$/, "Kürzel im Format K-XXXXXXXX")
const BEGRIFF = z.string().trim().min(2).max(40)
const STATUS = z.enum(["new", "queued", "analyzing", "scored", "error", "stale", "shortlisted", "interviewed", "rejected", "hired"])

export interface ToolContext {
  /** Client mit der Sitzung des Nutzers. RLS greift. */
  db: SupabaseClient
  /** Service-Rolle. Nur für Seitentext und Matching im Hintergrund. */
  admin: SupabaseClient
  ownerId: string
  /** Ergebnisse der vorherigen Schritte dieses Laufs, für refs_aus_schritt. */
  previous: StepResult[]
}

/** Was ein Schritt liefert. data geht als Datenblock an das Antwortmodell. */
export interface StepResult {
  schritt: number
  werkzeug: string
  refs: string[]
  data: unknown
  /** Texte je Kürzel (und "stelle:<id>"), gegen die der Belegprüfer abgleicht. */
  korpus: Record<string, string[]>
  /** Text aus Bewerberunterlagen, der auf Anweisungen geprüft wird. */
  bewerbertext?: string[]
}

export interface ToolDef<P extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string
  effect: Effect
  description: string
  params: P
  /** Klartext für den Plan, vor der Ausführung angezeigt. */
  describe(p: z.infer<P>): string
  /** Matches, die der Schritt verbraucht. Vor der Ausführung berechnet. */
  cost(p: z.infer<P>, ctx: ToolContext): Promise<number>
  run(p: z.infer<P>, ctx: ToolContext, schritt: number): Promise<StepResult>
}

function def<P extends z.ZodTypeAny>(d: ToolDef<P>): ToolDef<P> {
  return d
}

const noCost = async () => 0

// ── Hilfen ───────────────────────────────────────────────────────────────────

const refsAusSchritt = z.number().int().min(1).max(10)

/** Kürzel aus Parameter oder aus einem früheren Schritt (in dessen Reihenfolge). */
function resolveRefs(p: { refs?: string[]; refs_aus_schritt?: number; anzahl?: number }, ctx: ToolContext): string[] {
  if (p.refs?.length) return p.refs
  if (p.refs_aus_schritt) {
    const prev = ctx.previous.find((s) => s.schritt === p.refs_aus_schritt)
    return (prev?.refs ?? []).slice(0, p.anzahl ?? 10)
  }
  return []
}

interface CandidateRow {
  candidate_id: string
  ref: string
  ort: string | null
  position: string | null
  berufsjahre: number | null
  stufe: string | null
  skills: string[] | null
  ausbildung: string | null
  dossier: Record<string, unknown> | null
  talent_pool: boolean
  eingang: string
}

interface ApplicationRow {
  bewerbung_id: string
  stelle_id: string
  candidate_id: string
  ref: string
  status: string
  score: number | null
  kategorien: Record<string, number | null> | null
  detail: Record<string, { konfidenz?: string; belege?: string[] }> | null
  ko: boolean
  eingang: string
}

const CANDIDATE_COLS = "candidate_id, ref, ort, position, berufsjahre, stufe, skills, ausbildung, dossier, talent_pool, eingang"
const APPLICATION_COLS = "bewerbung_id, stelle_id, candidate_id, ref, status, score, kategorien, detail, ko, eingang"

function revy(db: SupabaseClient) {
  return db.schema("revy")
}

function lower(s: unknown): string {
  return String(s ?? "").toLowerCase()
}

function dossierSkills(c: CandidateRow): string[] {
  const list = (c.dossier?.skills as Array<{ skill?: string }> | undefined) ?? []
  return list.map((s) => s.skill ?? "").filter(Boolean)
}

/** Kurzprofil für Listen. Nie candidate_id: Das Modell sieht nur Kürzel. */
function brief(c: CandidateRow) {
  return {
    ref: c.ref,
    position: c.position,
    ort: c.ort,
    berufsjahre: c.berufsjahre,
    stufe: c.stufe,
    skills: (c.skills ?? []).slice(0, 15),
  }
}

/** Alle Werte eines Objekts als Texte, für den Belegprüfer. */
export function flattenStrings(v: unknown, out: string[] = []): string[] {
  if (v == null) return out
  if (typeof v === "string") out.push(v)
  else if (typeof v === "number" || typeof v === "boolean") out.push(String(v))
  else if (Array.isArray(v)) v.forEach((x) => flattenStrings(x, out))
  else if (typeof v === "object") Object.values(v as Record<string, unknown>).forEach((x) => flattenStrings(x, out))
  return out
}

async function candidatesByRefs(ctx: ToolContext, refs: string[]): Promise<CandidateRow[]> {
  if (refs.length === 0) return []
  const { data, error } = await revy(ctx.db).from("candidates").select(CANDIDATE_COLS).in("ref", refs)
  if (error) throw new Error(`Kandidaten nicht lesbar: ${error.message}`)
  const rows = (data ?? []) as CandidateRow[]
  return refs.map((r) => rows.find((c) => c.ref === r)).filter((c): c is CandidateRow => !!c)
}

// ── Werkzeuge ────────────────────────────────────────────────────────────────

const poolSuchen = def({
  name: "pool_suchen",
  effect: "LESEND",
  description:
    "Durchsucht die Kandidaten des Arbeitsbereichs nach Skills, Position, Ort und Mindestjahren Berufserfahrung. Mit stelle_id nur die Bewerbungen dieser Stelle, sortierbar nach Score. Liefert Kürzel und Kurzprofile.",
  params: z.object({
    skills: z.array(BEGRIFF).max(10).optional().describe("Skills, die vorkommen sollen (alle)"),
    position: BEGRIFF.optional().describe("Teil der Positionsbezeichnung"),
    ort: BEGRIFF.optional().describe("Stadt"),
    min_berufsjahre: z.number().int().min(0).max(50).optional(),
    stelle_id: z.string().uuid().optional().describe("Nur Bewerbungen dieser Stelle"),
    status: STATUS.optional().describe("Nur Bewerbungen mit diesem Status (mit stelle_id)"),
    nur_talent_pool: z.boolean().optional(),
    sortierung: z.enum(["score", "berufsjahre", "eingang"]).optional(),
    limit: z.number().int().min(1).max(50).optional(),
  }),
  describe: (p) => {
    const teile = [
      p.stelle_id ? "Bewerbungen der Stelle" : "Pool",
      p.skills?.length ? `Skills ${p.skills.join(", ")}` : null,
      p.position ? `Position „${p.position}“` : null,
      p.ort ? `Ort ${p.ort}` : null,
      p.min_berufsjahre != null ? `mindestens ${p.min_berufsjahre} Jahre Erfahrung` : null,
      p.status ? `Status ${p.status}` : null,
      p.nur_talent_pool ? "nur Talent-Pool" : null,
      p.sortierung ? `sortiert nach ${{ score: "Score", berufsjahre: "Berufsjahren", eingang: "Eingang" }[p.sortierung]}` : null,
    ].filter(Boolean)
    return `Durchsuchen: ${teile.join(", ")}`
  },
  cost: noCost,
  async run(p, ctx, schritt) {
    const limit = p.limit ?? 20
    let apps: ApplicationRow[] = []
    let rows: CandidateRow[]
    if (p.stelle_id) {
      let q = revy(ctx.db).from("applications").select(APPLICATION_COLS).eq("stelle_id", p.stelle_id).limit(1000)
      if (p.status) q = q.eq("status", p.status)
      const { data, error } = await q
      if (error) throw new Error(`Bewerbungen nicht lesbar: ${error.message}`)
      apps = (data ?? []) as ApplicationRow[]
      rows = await candidatesByRefs(ctx, apps.map((a) => a.ref))
    } else {
      const { data, error } = await revy(ctx.db).from("candidates").select(CANDIDATE_COLS).limit(2000)
      if (error) throw new Error(`Kandidaten nicht lesbar: ${error.message}`)
      rows = (data ?? []) as CandidateRow[]
    }

    const wanted = (p.skills ?? []).map(lower)
    const hits = rows.filter((c) => {
      if (p.nur_talent_pool && !c.talent_pool) return false
      if (p.min_berufsjahre != null && (c.berufsjahre ?? 0) < p.min_berufsjahre) return false
      if (p.position && !lower(c.position).includes(lower(p.position))) return false
      if (p.ort && !lower(c.ort).includes(lower(p.ort))) return false
      const all = [...(c.skills ?? []), ...dossierSkills(c)].map(lower)
      return wanted.every((w) => all.some((s) => s.includes(w)))
    })

    const scoreOf = (ref: string) => apps.find((a) => a.ref === ref)?.score ?? null
    const sort = p.sortierung ?? (p.stelle_id ? "score" : "berufsjahre")
    hits.sort((a, b) => {
      if (sort === "score") return (scoreOf(b.ref) ?? -1) - (scoreOf(a.ref) ?? -1)
      if (sort === "eingang") return b.eingang.localeCompare(a.eingang)
      return (b.berufsjahre ?? 0) - (a.berufsjahre ?? 0)
    })

    const list = hits.slice(0, limit).map((c) => {
      const app = apps.find((a) => a.ref === c.ref)
      return { ...brief(c), ...(app ? { score: app.score, status: app.status, ko: app.ko } : {}) }
    })
    const korpus: Record<string, string[]> = {}
    for (const item of list) korpus[item.ref] = flattenStrings(item)
    return { schritt, werkzeug: "pool_suchen", refs: list.map((c) => c.ref), data: { gefunden: hits.length, liste: list }, korpus }
  },
})

const stelleDetails = def({
  name: "stelle_details",
  effect: "LESEND",
  description: "Anforderungen einer Stelle: Titel, Ort, Muss- und Kann-Skills, Erfahrung, Ausbildung, Sprachen, K.O.-Kriterien, Beschreibung.",
  params: z.object({ stelle_id: z.string().uuid() }),
  describe: () => "Anforderungen der Stelle lesen",
  cost: noCost,
  async run(p, ctx, schritt) {
    const { data, error } = await revy(ctx.db)
      .from("jobs")
      .select("stelle_id, titel, ort, anstellung, muss_skills, kann_skills, erfahrung, ausbildung, sprachen, ko_kriterien, beschreibung, aktiv")
      .eq("stelle_id", p.stelle_id)
      .maybeSingle()
    if (error) throw new Error(`Stelle nicht lesbar: ${error.message}`)
    const stelle = data ? { ...data, beschreibung: String(data.beschreibung ?? "").slice(0, 4000) } : null
    return {
      schritt,
      werkzeug: "stelle_details",
      refs: [],
      data: stelle ?? { hinweis: "Stelle nicht gefunden oder nicht sichtbar" },
      korpus: stelle ? { [`stelle:${p.stelle_id}`]: flattenStrings(stelle) } : {},
    }
  },
})

const refsParams = {
  refs: z.array(REF).min(1).max(10).optional(),
  refs_aus_schritt: refsAusSchritt.optional().describe("Kürzel aus dem Ergebnis eines früheren Schritts (Nummer ab 1)"),
  anzahl: z.number().int().min(1).max(10).optional().describe("Wie viele Kürzel aus dem früheren Schritt, in dessen Reihenfolge"),
}

const kandidatDetails = def({
  name: "kandidat_details",
  effect: "LESEND",
  description:
    "Profil von Kandidaten: Stationen, Skills mit Beleg, Sprachen, Abschlüsse, Zertifikate, Führung. Mit stelle_id zusätzlich Score, Status, Kategorien und Belege aus dem Matching.",
  params: z.object({ ...refsParams, stelle_id: z.string().uuid().optional() }),
  describe: (p) =>
    `Profile lesen${p.refs?.length ? ` (${p.refs.join(", ")})` : p.refs_aus_schritt ? ` (aus Schritt ${p.refs_aus_schritt})` : ""}${p.stelle_id ? " mit Matching zur Stelle" : ""}`,
  cost: noCost,
  async run(p, ctx, schritt) {
    const refs = resolveRefs(p, ctx)
    const rows = await candidatesByRefs(ctx, refs)
    let apps: ApplicationRow[] = []
    if (rows.length) {
      let q = revy(ctx.db).from("applications").select(APPLICATION_COLS).in("ref", rows.map((r) => r.ref))
      if (p.stelle_id) q = q.eq("stelle_id", p.stelle_id)
      const { data, error } = await q
      if (error) throw new Error(`Bewerbungen nicht lesbar: ${error.message}`)
      apps = (data ?? []) as ApplicationRow[]
    }
    const profiles = rows.map((c) => ({
      ...brief(c),
      ausbildung: c.ausbildung,
      dossier: c.dossier,
      bewerbungen: apps
        .filter((a) => a.ref === c.ref)
        .map((a) => ({ stelle_id: a.stelle_id, status: a.status, score: a.score, ko: a.ko, kategorien: a.kategorien, belege_matching: a.detail })),
    }))
    const korpus: Record<string, string[]> = {}
    for (const pr of profiles) korpus[pr.ref] = flattenStrings(pr)
    return {
      schritt,
      werkzeug: "kandidat_details",
      refs: profiles.map((x) => x.ref),
      data: profiles.length ? profiles : { hinweis: "Keine sichtbaren Kandidaten zu diesen Kürzeln" },
      korpus,
      bewerbertext: profiles.flatMap((x) => flattenStrings(x.dossier)),
    }
  },
})

const belegeSuchen = def({
  name: "belege_suchen",
  effect: "LESEND",
  description:
    "Sucht in Lebenslauf und Anschreiben von Kandidaten nach Begriffen und liefert Ausschnitte mit Seite. Name, Kontaktdaten und gesperrte Merkmale sind geschwärzt.",
  params: z.object({ ...refsParams, begriffe: z.array(BEGRIFF).min(1).max(8) }),
  describe: (p) =>
    `Unterlagen nach ${p.begriffe.map((b) => `„${b}“`).join(", ")} durchsuchen${p.refs?.length ? ` (${p.refs.join(", ")})` : p.refs_aus_schritt ? ` (Kandidaten aus Schritt ${p.refs_aus_schritt})` : ""}`,
  cost: noCost,
  async run(p, ctx, schritt) {
    const refs = resolveRefs(p, ctx)
    const rows = await candidatesByRefs(ctx, refs)
    const out: Array<{ ref: string; dokument: string; seite: number; ausschnitt: string }> = []
    const korpus: Record<string, string[]> = {}
    for (const c of rows) {
      await ensureDocumentPages(ctx.db, ctx.admin, c.candidate_id)
      const { data, error } = await revy(ctx.db).rpc("belege", { p_ref: c.ref, p_begriffe: p.begriffe })
      if (error) throw new Error(`Belege nicht lesbar: ${error.message}`)
      for (const b of (data ?? []) as Array<{ dokument: string; seite: number; ausschnitt: string }>) {
        out.push({ ref: c.ref, ...b })
        ;(korpus[c.ref] ??= []).push(b.ausschnitt)
      }
    }
    return {
      schritt,
      werkzeug: "belege_suchen",
      refs: rows.map((c) => c.ref),
      data: out.length ? out : { hinweis: "Keine Stelle in den Unterlagen gefunden" },
      korpus,
      bewerbertext: out.map((b) => b.ausschnitt),
    }
  },
})

const gegenStelleMatchen = def({
  name: "gegen_stelle_matchen",
  effect: "LESEND",
  description:
    "Startet das Matching von Kandidaten gegen eine Stelle. Verbraucht je Kandidat ein Match aus dem Kontingent; vorher fragt Revetly den Nutzer. Bereits verknüpfte Kandidaten werden übersprungen. Das Ergebnis erscheint in der Stelle, sobald das Matching fertig ist.",
  params: z.object({
    stelle_id: z.string().uuid(),
    ...refsParams,
    refs: z.array(REF).min(1).max(50).optional(),
    anzahl: z.number().int().min(1).max(50).optional(),
  }),
  describe: (p) =>
    `Gegen die Stelle matchen${p.refs?.length ? ` (${p.refs.length} Kandidaten)` : p.refs_aus_schritt ? ` (Kandidaten aus Schritt ${p.refs_aus_schritt})` : ""}`,
  async cost(p, ctx) {
    return (await pendingCandidates(p, ctx)).length
  },
  async run(p, ctx, schritt) {
    const pending = await pendingCandidates(p, ctx)
    const gestartet: string[] = []
    const uebersprungen: Array<{ ref: string; grund: string }> = []
    for (const c of pending) {
      const r = await linkCandidateToJob(ctx.db, { ownerId: ctx.ownerId, jobId: p.stelle_id, candidateId: c.candidate_id })
      if (r.ok) {
        scoreLinkInBackground(r.linkId)
        gestartet.push(c.ref)
      } else {
        const grund = r.body.error === "match_limit_reached" ? "Match-Kontingent erreicht" : String(r.body.error ?? "nicht möglich")
        uebersprungen.push({ ref: c.ref, grund })
        if (r.body.error === "match_limit_reached") break
      }
    }
    const data = { gestartet: gestartet.length, uebersprungen, hinweis: "Die Scores erscheinen in der Stelle, sobald das Matching fertig ist." }
    return { schritt, werkzeug: "gegen_stelle_matchen", refs: gestartet, data, korpus: {} }
  },
})

/** Kandidaten, die noch nicht mit der Stelle verknüpft sind. */
async function pendingCandidates(
  p: { stelle_id: string; refs?: string[]; refs_aus_schritt?: number; anzahl?: number },
  ctx: ToolContext,
): Promise<CandidateRow[]> {
  const refs = resolveRefs(p, ctx)
  const rows = await candidatesByRefs(ctx, refs)
  if (rows.length === 0) return []
  const { data } = await revy(ctx.db).from("applications").select("ref").eq("stelle_id", p.stelle_id).in("ref", rows.map((r) => r.ref))
  const linked = new Set(((data ?? []) as Array<{ ref: string }>).map((a) => a.ref))
  return rows.filter((r) => !linked.has(r.ref))
}

/** Freie Matches im Kontingent, für den Abrechnungsdialog. */
export async function remainingMatches(ctx: ToolContext): Promise<number | null> {
  const usage = await getMatchUsage(ctx.db, ctx.ownerId)
  return usage ? usage.remaining : null
}

export const REGISTRY = {
  pool_suchen: poolSuchen,
  stelle_details: stelleDetails,
  kandidat_details: kandidatDetails,
  belege_suchen: belegeSuchen,
  gegen_stelle_matchen: gegenStelleMatchen,
} as const satisfies Record<string, ToolDef>

export type ToolName = keyof typeof REGISTRY

export function getTool(name: string): ToolDef | null {
  return Object.prototype.hasOwnProperty.call(REGISTRY, name) ? (REGISTRY as Record<string, ToolDef>)[name] : null
}
