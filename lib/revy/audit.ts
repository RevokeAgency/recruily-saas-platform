import type { SupabaseClient } from "@supabase/supabase-js"
import type { Effect } from "./tools"

// ─────────────────────────────────────────────────────────────────────────────
// Protokoll von Revy (revy_audit, nur anhängen). Ein Eintrag je Schritt:
// Zeit, Nutzer, Befehl im Wortlaut, Plan, Werkzeug mit Parametern,
// Wirkungsklasse, betroffene Kürzel, Freigabe, Modell und Ergebnis.
// Kandidaten erscheinen nur als Kürzel. Hat die Sperrschicht gegriffen, wird
// der Befehl nicht gespeichert.
// ─────────────────────────────────────────────────────────────────────────────

export interface AuditEntry {
  user_id: string
  actor_id: string
  run_id: string | null
  befehl?: string | null
  plan?: unknown
  werkzeug: string
  parameter?: unknown
  wirkung: Effect | "SYSTEM"
  refs?: string[]
  freigabe_durch?: string | null
  freigabe_am?: string | null
  modell?: string | null
  modell_version?: string | null
  ergebnis?: unknown
}

export async function writeAudit(admin: SupabaseClient, entry: AuditEntry): Promise<void> {
  const { error } = await admin.from("revy_audit").insert({ refs: [], ...entry })
  // Ohne Protokoll kein Weiterarbeiten: Der Aufrufer bricht ab.
  if (error) throw new Error(`Revy-Protokoll nicht geschrieben: ${error.message}`)
}

export async function logBlocked(admin: SupabaseClient, ownerId: string, kategorie: string): Promise<void> {
  const { error } = await admin.from("revy_blocked_requests").insert({ user_id: ownerId, kategorie })
  if (error) console.error("[revy] Sperre nicht protokolliert:", error.message)
}

export async function logIncident(
  admin: SupabaseClient,
  ownerId: string,
  runId: string | null,
  art: string,
  detail: Record<string, unknown>,
): Promise<void> {
  const { error } = await admin.from("revy_incidents").insert({ user_id: ownerId, run_id: runId, art, detail })
  if (error) console.error("[revy] Vorfall nicht protokolliert:", error.message)
}

export const AUDIT_FIELDS = [
  "id",
  "created_at",
  "run_id",
  "actor_id",
  "befehl",
  "plan",
  "werkzeug",
  "parameter",
  "wirkung",
  "refs",
  "freigabe_durch",
  "freigabe_am",
  "modell",
  "modell_version",
  "ergebnis",
] as const

export type AuditRow = Record<(typeof AUDIT_FIELDS)[number], unknown>

/** Liest das Protokoll mit der Sitzung des Nutzers (RLS: eigener Mandant). */
export async function readAudit(
  db: SupabaseClient,
  opts: { from?: string; to?: string; runId?: string; limit?: number } = {},
): Promise<AuditRow[]> {
  let q = db.from("revy_audit").select(AUDIT_FIELDS.join(", ")).order("id", { ascending: true }).limit(opts.limit ?? 5000)
  if (opts.from) q = q.gte("created_at", opts.from)
  if (opts.to) q = q.lte("created_at", opts.to)
  if (opts.runId) q = q.eq("run_id", opts.runId)
  const { data, error } = await q
  if (error) throw new Error(`Protokoll nicht lesbar: ${error.message}`)
  // Jedes Feld in jeder Zeile, auch wenn leer: Der Export hat eine feste Form.
  return ((data ?? []) as unknown as Array<Record<string, unknown>>).map(
    (r) => Object.fromEntries(AUDIT_FIELDS.map((f) => [f, r[f] ?? null])) as AuditRow,
  )
}

function csvCell(v: unknown): string {
  if (v == null) return ""
  const s = typeof v === "string" ? v : Array.isArray(v) && v.every((x) => typeof x === "string") ? v.join(" ") : JSON.stringify(v)
  // Formeln in Tabellenprogrammen entschärfen
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

/** CSV mit Semikolon (Excel im deutschsprachigen Raum), Kopfzeile, UTF-8 mit BOM. */
export function auditToCsv(rows: AuditRow[]): string {
  const lines = [AUDIT_FIELDS.join(";"), ...rows.map((r) => AUDIT_FIELDS.map((f) => csvCell(r[f])).join(";"))]
  return `﻿${lines.join("\r\n")}\r\n`
}
