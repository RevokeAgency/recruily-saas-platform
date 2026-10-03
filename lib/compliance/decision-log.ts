import type { SupabaseClient } from "@supabase/supabase-js"

// ─────────────────────────────────────────────────────────────────────────────
// Entscheidungsprotokoll (Migration 031, Tabelle decision_events).
//
// Statuswechsel und bewertete Gespräche schreibt ein Datenbank-Trigger
// selbst. Hier stehen die Ereignisse, die nur der Server kennt: Stelle
// abgeschlossen, menschliche Prüfung bestätigt, Absage verschickt.
//
// Keine Namen, keine Kontaktdaten. Der Export (/api/jobs/[id]/decision-log)
// ergänzt die Namen, solange die Kandidaten noch existieren.
// ─────────────────────────────────────────────────────────────────────────────

export type DecisionEvent =
  | "stelle_abgeschlossen"
  | "pruefung_bestaetigt"
  | "absage_verschickt"
  | "an_fachbereich_gesendet"
  | "rueckmeldung_fachbereich"
  | "report_erstellt"

export interface DecisionEntry {
  userId: string
  actorId?: string | null
  jobId?: string | null
  jobCandidateId?: string | null
  event: DecisionEvent
  detail?: Record<string, unknown>
}

/** Wortlaut der Bestätigung beim Abschließen, so wie er im Protokoll steht. */
export const OVERSIGHT_STATEMENT =
  "Ich habe die offenen Bewerbungen geprüft. Die Absagen beruhen auf meiner Entscheidung, nicht allein auf dem Match."

/**
 * Schreibt Einträge ins Protokoll. Best-effort: Ein Fehler (etwa Migration
 * 031 noch nicht eingespielt) wird geloggt und hält den Vorgang nicht auf.
 */
export async function logDecisions(db: SupabaseClient, entries: DecisionEntry[]): Promise<void> {
  if (entries.length === 0) return
  const { error } = await db.from("decision_events").insert(
    entries.map((e) => ({
      user_id: e.userId,
      actor_id: e.actorId ?? null,
      job_id: e.jobId ?? null,
      job_candidate_id: e.jobCandidateId ?? null,
      event: e.event,
      detail: e.detail ?? {},
    })),
  )
  if (error) console.error("[decision-log] Eintrag übersprungen:", error.message)
}
