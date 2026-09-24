import type { SupabaseClient } from "@supabase/supabase-js"

// Match und Screening, seit Migration 029 zwei verschiedene Werte.
//
//   screening_score  Ergebnis der Revetly Match Analyse, rein aus den
//                    Unterlagen (IMLRS).
//   match_score      Der Match, den Nutzer sehen. Ohne Gespräch gleich dem
//                    Screening; mit Gespräch fließt der Gesprächswert ein,
//                    gedeckelt durch die Qualifikationssperre. Gerechnet wird
//                    das in der Datenbank (Trigger aus 029), damit jede Stelle,
//                    die einen Score schreibt, automatisch mitmacht.
//
// Wer die Qualität der Analyse misst oder sie mit dem Gespräch vergleicht
// (Kalibrierung, Qualitätsprüfung, Bestenvergleich), braucht den reinen
// Screening-Wert. Sonst zählt das Gespräch doppelt.

/** Gewicht des Gesprächs im Match. Muss mit interview_weight() in 029 übereinstimmen. */
export const INTERVIEW_WEIGHT = 0.4

/** Reiner Screening-Wert. Vor Migration 029 gibt es nur match_score. */
export function screeningOf(row: { screening_score?: number | null; match_score?: number | null }): number | null {
  return row.screening_score ?? row.match_score ?? null
}

/** Erkennt den Fehler "Spalte screening_score fehlt" (029 nicht eingespielt). */
export function isMissingScreeningColumn(message: string | null | undefined): boolean {
  return /screening_score/i.test(message || "")
}

const CALIB_COLUMNS =
  "match_score, interview_score, status, knockout, " +
  "hard_skills_score, experience_score, education_score, soft_skills_score, " +
  "languages_score, location_score, industry_score, salary_score, culture_score"

/**
 * Zeilen für die Kalibrierung eines Kontos. Die Kalibrierung misst, wie gut
 * die ANALYSE die Entscheidungen vorhergesagt hat, und wertet das Gespräch
 * getrennt aus. match_score wird deshalb durch den reinen Screening-Wert
 * ersetzt. Genutzt vom nächtlichen Cron und von /api/matching/quality.
 */
export async function fetchCalibrationRows(
  db: SupabaseClient,
  userId: string,
): Promise<{ rows: Record<string, unknown>[] | null; error: { message?: string } | null }> {
  const query = (withScreening: boolean) =>
    db
      .from("job_candidates")
      .select((withScreening ? "screening_score, " : "") + CALIB_COLUMNS)
      .eq("user_id", userId)
      .not("match_score", "is", null)
      .limit(3000)

  let { data, error } = await query(true)
  if (error && isMissingScreeningColumn(error.message)) ({ data, error } = await query(false))
  if (error || !data) return { rows: null, error }

  const rows = (data as unknown as Record<string, unknown>[]).map((r) => ({
    ...r,
    match_score: screeningOf(r as { screening_score?: number | null; match_score?: number | null }),
  }))
  return { rows, error: null }
}
