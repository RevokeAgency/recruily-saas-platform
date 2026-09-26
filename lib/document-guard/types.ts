// ─────────────────────────────────────────────────────────────────────────────
// Befunde der Dokumentprüfung.
//
// Bewerbungsunterlagen landen als Text bei einem Sprachmodell. Wer dort Text
// versteckt (weiße Schrift, 1-pt-Schrift, in Word ausgeblendet), sieht ihn als
// Recruiter nie, das Modell aber schon. Genau diese Lücke schließt das Modul:
// Versteckter Text wird entfernt, bevor ein Modell ihn liest, und als Befund mit
// Beleg festgehalten.
//
// Bewusst NICHT Teil davon: eine Einschätzung, ob ein Text "mit KI geschrieben"
// wurde. Das lässt sich nicht verlässlich feststellen. Jeder Befund hier ist
// dagegen am Dokument nachprüfbar.
// ─────────────────────────────────────────────────────────────────────────────

export type FindingSource = "lebenslauf" | "anschreiben"

export type FindingReason =
  /** PDF: Text ohne sichtbaren Kontrast (Farbe wie Hintergrund, verdeckt). DOCX: weiße Schrift. */
  | "unsichtbar"
  /** Schrift unter 3 pt oder auf Unleserlichkeit gestaucht. */
  | "winzig"
  /** Text liegt außerhalb der Seite. */
  | "ausserhalb"
  /** In Word als ausgeblendet formatiert. */
  | "ausgeblendet"
  /** Unsichtbare Unicode-Zeichen, die Text für Menschen verbergen. */
  | "unicode"
  /** Sichtbarer Satz, der sich an eine KI richtet. */
  | "anweisung"

export interface DocumentFinding {
  source: FindingSource
  reason: FindingReason
  /** Seite im PDF (1-basiert), sofern bekannt. */
  page?: number
  /** Der betroffene Text, gekürzt. Das ist der Beleg für den Recruiter. */
  excerpt: string
}

/** Gespeichert in candidates.document_findings (Migration 030). null = noch nicht geprüft. */
export interface DocumentCheck {
  version: 1
  checked_at: string
  findings: DocumentFinding[]
}

export interface ExtractedDocument {
  /** Text ohne versteckte Stellen. Das bekommt das Modell. */
  text: string
  /** Text wie bisher extrahiert, inklusive versteckter Stellen. Nur zum Abgleich mit Altbeständen. */
  rawText: string
  findings: DocumentFinding[]
}

/** Versteckte Befunde entfernen Text, die übrigen markieren ihn nur. */
export const HIDDEN_REASONS: ReadonlySet<FindingReason> = new Set([
  "unsichtbar",
  "winzig",
  "ausserhalb",
  "ausgeblendet",
  "unicode",
])

const EXCERPT_MAX = 240

export function toExcerpt(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim()
  return clean.length > EXCERPT_MAX ? `${clean.slice(0, EXCERPT_MAX - 1).trimEnd()}…` : clean
}

/** Fasst aufeinanderfolgende Befunde gleicher Art (Quelle, Grund, Seite) zu einem zusammen. */
export function mergeAdjacent(parts: DocumentFinding[]): DocumentFinding[] {
  const out: DocumentFinding[] = []
  for (const f of parts) {
    const last = out[out.length - 1]
    if (last && last.source === f.source && last.reason === f.reason && last.page === f.page) {
      last.excerpt = `${last.excerpt} ${f.excerpt}`
    } else {
      out.push({ ...f })
    }
  }
  // Unter drei Buchstaben (ein weißer Aufzählungspunkt, ein Leerzeichen-
  // Rest) ist kein Befund, der einem Recruiter etwas sagt. Entfernt wird der
  // Text trotzdem.
  return out
    .map((f) => ({ ...f, excerpt: toExcerpt(f.excerpt) }))
    .filter((f) => (f.excerpt.match(/\p{L}/gu)?.length ?? 0) >= 3)
}
