import type { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"

// ─────────────────────────────────────────────────────────────────────────────
// Grundlagen des Werkzeugregisters von Revy (lib/revy/tools/).
//
// Jedes Werkzeug hat eine feste Wirkungsklasse im Code. Kein Parameter, keine
// Einstellung und keine Modellausgabe ändert sie. Die Freigaberegel dazu
// steht an genau einer Stelle: lib/revy/gate.ts.
//
// Lesen nur aus dem Schema revy (bereinigte Sichten, RLS mit der Sitzung des
// Nutzers): revy(ctx.db). Schreiben (INTERN) nur mit der Sitzung des Nutzers
// über userWrite(ctx), also mit RLS und mit ihm als Akteur in den
// Datenbank-Triggern, und nur in WRITABLE_TABLES. Die Service-Rolle kommt nur
// für Seitentext, Matching im Hintergrund und die Protokolltabellen von Revy
// vor. tests/revy-agent.test.ts prüft das im Quelltext.
//
// Parameter sind Whitelists: Kürzel im Format K-XXXXXXXX, UUIDs, kurze
// Begriffe, feste Statuswerte. Freie Abfragen gibt es nicht.
// ─────────────────────────────────────────────────────────────────────────────

export const EFFECTS = ["LESEND", "INTERN", "NACH_AUSSEN"] as const
export type Effect = (typeof EFFECTS)[number]

export const REF = z.string().regex(/^K-[0-9A-F]{8}$/, "Kürzel im Format K-XXXXXXXX")
export const BEGRIFF = z.string().trim().min(2).max(40)

/** Tabellen, in die INTERN-Werkzeuge mit der Sitzung des Nutzers schreiben. */
export const WRITABLE_TABLES = ["job_candidates", "candidate_tags"] as const

export interface ToolContext {
  /** Client mit der Sitzung des Nutzers. RLS greift. */
  db: SupabaseClient
  /** Service-Rolle. Nur für Seitentext, Matching im Hintergrund und Revy-Tabellen. */
  admin: SupabaseClient
  ownerId: string
  actorId: string
  runId: string | null
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
  /** Hinweise für den Nutzer (übersprungen, eingeschränkt). */
  hinweise?: string[]
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
  /** Wie viele Kandidaten der Schritt höchstens ändert (INTERN). Vor der Ausführung. */
  impact?(p: z.infer<P>): number
  run(p: z.infer<P>, ctx: ToolContext, schritt: number): Promise<StepResult>
}

export function def<P extends z.ZodTypeAny>(d: ToolDef<P>): ToolDef<P> {
  return d
}

export const noCost = async () => 0

// ── Kürzel ───────────────────────────────────────────────────────────────────

export const refsParams = {
  refs: z.array(REF).min(1).max(10).optional(),
  refs_aus_schritt: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .describe("Kürzel aus dem Ergebnis eines früheren Schritts (Nummer ab 1)"),
  anzahl: z.number().int().min(1).max(10).optional().describe("Wie viele Kürzel aus dem früheren Schritt, in dessen Reihenfolge"),
}

/** Kürzel aus Parameter oder aus einem früheren Schritt (in dessen Reihenfolge). */
export function resolveRefs(p: { refs?: string[]; refs_aus_schritt?: number; anzahl?: number }, ctx: ToolContext): string[] {
  if (p.refs?.length) return p.refs
  if (p.refs_aus_schritt) {
    const prev = ctx.previous.find((s) => s.schritt === p.refs_aus_schritt)
    return (prev?.refs ?? []).slice(0, p.anzahl ?? 10)
  }
  return []
}

/** Obergrenze der betroffenen Kandidaten, vor der Ausführung. */
export function refsUpperBound(p: { refs?: string[]; refs_aus_schritt?: number; anzahl?: number }): number {
  if (p.refs?.length) return p.refs.length
  if (p.refs_aus_schritt) return p.anzahl ?? 10
  return 0
}

export function describeRefs(p: { refs?: string[]; refs_aus_schritt?: number; anzahl?: number }): string {
  if (p.refs?.length) return p.refs.join(", ")
  if (p.refs_aus_schritt) return `${p.anzahl ? `${p.anzahl} ` : ""}Kandidaten aus Schritt ${p.refs_aus_schritt}`
  return "keine Kandidaten"
}

// ── Daten ────────────────────────────────────────────────────────────────────

export interface CandidateRow {
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

export interface ApplicationRow {
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

export const CANDIDATE_COLS = "candidate_id, ref, ort, position, berufsjahre, stufe, skills, ausbildung, dossier, talent_pool, eingang"
export const APPLICATION_COLS = "bewerbung_id, stelle_id, candidate_id, ref, status, score, kategorien, detail, ko, eingang"

/** Lesen: nur über das Schema revy. */
export function revy(db: SupabaseClient) {
  return db.schema("revy")
}

/** Schreiben: nur mit der Sitzung des Nutzers (RLS, Akteur in Triggern). */
export function userWrite(ctx: ToolContext) {
  return ctx.db
}

export async function candidatesByRefs(ctx: ToolContext, refs: string[]): Promise<CandidateRow[]> {
  if (refs.length === 0) return []
  const { data, error } = await revy(ctx.db).from("candidates").select(CANDIDATE_COLS).in("ref", refs)
  if (error) throw new Error(`Kandidaten nicht lesbar: ${error.message}`)
  const rows = (data ?? []) as CandidateRow[]
  return refs.map((r) => rows.find((c) => c.ref === r)).filter((c): c is CandidateRow => !!c)
}

/** Kleinbuchstaben, Umlaute ausgeschrieben, Satzzeichen zu Leerzeichen. */
export function fold(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9+#]+/g, " ")
    .trim()
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

// ── Status ───────────────────────────────────────────────────────────────────

/** Status, wie die App sie zeigt, und die Werte in der Datenbank dazu. */
export const STATUS_GRUPPEN = {
  neu: ["new"],
  wartet: ["queued"],
  in_analyse: ["analyzing"],
  bewertet: ["scored"],
  shortlist: ["shortlisted"],
  eingeladen: ["Eingeladen", "interviewed"],
  eingestellt: ["Eingestellt", "hired"],
  abgesagt: ["Abgesagt", "rejected"],
  fehler: ["error", "stale"],
} as const
export type StatusGruppe = keyof typeof STATUS_GRUPPEN
export const STATUS_PARAM = z.enum(Object.keys(STATUS_GRUPPEN) as [StatusGruppe, ...StatusGruppe[]])

const STATUS_LABEL: Record<string, string> = {
  new: "Neu",
  queued: "Wartet auf Kontingent",
  analyzing: "In Analyse",
  scored: "Bewertet",
  shortlisted: "Shortlist",
  interviewed: "Eingeladen",
  Eingeladen: "Eingeladen",
  hired: "Eingestellt",
  Eingestellt: "Eingestellt",
  rejected: "Abgesagt",
  Abgesagt: "Abgesagt",
  error: "Fehler",
  stale: "Veraltet",
}

export function statusLabel(s: string | null | undefined): string {
  return s ? STATUS_LABEL[s] ?? s : ""
}
