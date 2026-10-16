// ─────────────────────────────────────────────────────────────────────────────
// Sichtbarkeit von Stellen im Team (Migration 036).
//
//   private  nur wer die Stelle angelegt hat, und der Inhaber
//   team     alle im Team sehen und bearbeiten sie
//
// Neue Stellen sind privat. Durchgesetzt wird das in der Datenbank (RLS,
// job_visible, candidate_visible); hier stehen nur Eingabe und Anzeige.
// ─────────────────────────────────────────────────────────────────────────────

export type JobVisibility = "private" | "team"

export const DEFAULT_VISIBILITY: JobVisibility = "private"

export const VISIBILITY_LABEL: Record<JobVisibility, { title: string; hint: string }> = {
  private: { title: "Nur ich", hint: "Die Stelle und ihre Bewerber siehst nur du. Der Inhaber des Kontos sieht sie auch." },
  team: { title: "Ganzes Team", hint: "Alle im Team sehen die Stelle und ihre Bewerber und können sie bearbeiten." },
}

export function parseVisibility(value: unknown): JobVisibility {
  return value === "team" ? "team" : DEFAULT_VISIBILITY
}

/** Für den Rückfall, solange Migration 036 fehlt. */
export function withoutVisibility<T extends Record<string, unknown>>(data: T): Omit<T, "visibility"> {
  const { visibility: _omit, ...rest } = data
  void _omit
  return rest
}

/** Darf diese Person die Sichtbarkeit ändern? Ersteller und Inhaber. */
export function canChangeVisibility(job: { created_by?: string | null; user_id?: string | null }, userId: string): boolean {
  // created_by fehlt nur ohne Migration 036, dann gibt es keine Einschränkung.
  return job.user_id === userId || job.created_by === userId || job.created_by === undefined
}

/**
 * Sieht diese Person die Stelle? Dieselbe Regel wie job_visible in 036, für
 * Stellen, die mit service_role gelesen werden (Benachrichtigungen). Inhaber
 * immer, sonst bei team oder als Ersteller. Ohne Angaben (Migration fehlt)
 * sieht das Team alles, wie vorher.
 */
export function jobVisibleTo(
  personId: string,
  ownerId: string,
  job: { visibility?: string | null; created_by?: string | null } | undefined,
): boolean {
  if (personId === ownerId || !job || job.visibility !== "private") return true
  return job.created_by === personId
}
