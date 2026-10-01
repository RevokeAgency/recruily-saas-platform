// ─────────────────────────────────────────────────────────────────────────────
// Bewerberfotos: privat gespeichert, ausgeliefert nur an das eigene Konto.
//
// Der Speicherbereich "candidate-photos" ist seit Migration 032 privat. In
// candidates.photo_url steht deshalb keine öffentliche Adresse mehr, sondern
// der Pfad zur eigenen Route /api/candidates/<id>/photo. Die prüft, ob der
// Kandidat zum angemeldeten Konto gehört, und leitet auf einen signierten
// Link weiter, der eine Stunde gilt. Jede Stelle, die photo_url als <img src>
// nutzt, funktioniert damit ohne Änderung.
// ─────────────────────────────────────────────────────────────────────────────

export const PHOTO_BUCKET = "candidate-photos"

/** Ablageort im Speicher: ein Foto pro Kandidat, im Ordner des Kontos. */
export function candidatePhotoPath(userId: string, candidateId: string): string {
  return `${userId}/${candidateId}.png`
}

/**
 * Adresse, unter der die App das Foto zeigt. Der Versionsparameter sorgt
 * dafür, dass ein neu extrahiertes Foto nicht aus dem Browser-Cache kommt.
 */
export function candidatePhotoUrl(candidateId: string): string {
  return `/api/candidates/${candidateId}/photo?v=${Date.now().toString(36)}`
}
