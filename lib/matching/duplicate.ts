import { createHash } from "node:crypto"
import type { SupabaseClient } from "@supabase/supabase-js"

// Doppelter Lebenslauf in derselben Stelle.
//
// Lädt ein Kunde denselben Lebenslauf zweimal in eine Stelle, entsteht ein
// zweiter Kandidat und ein zweites Matching. Das Modell antwortet auch bei
// Temperatur 0 nicht immer gleich, also stünden zwei verschiedene Scores für
// dieselbe Person nebeneinander, und ein Match wäre doppelt verbraucht.
//
// Erkannt wird am Text, nicht an der Datei: Dieselbe Datei ergibt denselben
// Text, und ein erneuter Export desselben Lebenslaufs (anderes Datum in den
// PDF-Metadaten, andere Bytes) wird trotzdem erkannt. Der Text wird dafür
// vereinheitlicht: Kleinschreibung, nur Buchstaben und Ziffern. Damit spielen
// Zeilenumbrüche, Leerzeichen und Silbentrennung beim Auslesen keine Rolle.

/** Unter dieser Länge ist der Text zu kurz für einen verlässlichen Vergleich. */
const MIN_CHARS = 200

export function normalizeResumeText(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
}

/** Fingerabdruck des Lebenslauftexts, oder null bei zu wenig Text. */
export function resumeFingerprint(text: string | null | undefined): string | null {
  if (!text) return null
  const norm = normalizeResumeText(text)
  if (norm.length < MIN_CHARS) return null
  return createHash("sha256").update(norm).digest("hex")
}

export interface DuplicateHit {
  linkId: string
  candidateId: string
  name: string | null
}

/**
 * Sucht in einer Stelle einen anderen Kandidaten mit demselben Lebenslauf.
 * Vergleicht mit dem gespeicherten Text der Kandidaten, die schon in der
 * Stelle sind. Kandidaten ohne gespeicherten Text (sehr alte Einträge) werden
 * übersprungen. Wirft nie: Im Zweifel geht die Bewerbung durch.
 */
export async function findDuplicateInJob(
  db: SupabaseClient,
  jobId: string,
  resumeText: string | null | undefined,
  excludeCandidateId?: string,
): Promise<DuplicateHit | null> {
  const fp = resumeFingerprint(resumeText)
  if (!fp) return null
  try {
    const { data, error } = await db
      .from("job_candidates")
      .select("id, candidate_id, candidate:candidates(id, full_name, resume_text)")
      .eq("job_id", jobId)
    if (error || !data) return null
    for (const row of data as unknown as Array<{
      id: string
      candidate_id: string
      candidate: { id: string; full_name: string | null; resume_text: string | null } | null
    }>) {
      if (!row.candidate || row.candidate_id === excludeCandidateId) continue
      if (resumeFingerprint(row.candidate.resume_text) === fp) {
        return { linkId: row.id, candidateId: row.candidate_id, name: row.candidate.full_name }
      }
    }
    return null
  } catch (err) {
    console.error("[duplicate] Prüfung übersprungen:", err)
    return null
  }
}

/** Meldung für Recruiter, wenn der Lebenslauf in der Stelle schon liegt. */
export function duplicateMessage(hit: DuplicateHit): string {
  return hit.name
    ? `Dieser Lebenslauf ist in der Stelle schon vorhanden (${hit.name}). Es wurde kein Match verbraucht.`
    : "Dieser Lebenslauf ist in der Stelle schon vorhanden. Es wurde kein Match verbraucht."
}
