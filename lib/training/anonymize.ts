// Pseudonymisierung für Trainingsdaten.
//
// Grundsatz: Ein Modell muss lernen, wie MAN BEWERTET — nicht, WER bewertet
// wurde. Für das Training ist der Name eines Bewerbers wertlos, aber rechtlich
// hochriskant. Deshalb werden direkte Identifikatoren VOR dem Speichern durch
// stabile Platzhalter ersetzt (Struktur und Fachbegriffe bleiben erhalten).
//
// Bewusst konservativ: Im Zweifel wird lieber zu viel maskiert. Die
// Bewertungslogik (Skills, Jahre, Belege, Begründungen) bleibt vollständig.

export interface AnonymizeOptions {
  /** Namen, die zusätzlich maskiert werden (Bewerber, Firmen …). */
  names?: (string | null | undefined)[]
}

const EMAIL = /\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g
// Internationale und nationale Rufnummern, inkl. Trenner.
const PHONE = /(\+?\d[\d\s()/.-]{7,}\d)/g
const URL = /\bhttps?:\/\/\S+|\bwww\.\S+/gi
const IBAN = /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g
// Geburtsdaten / vollständige Datumsangaben mit Tag (Monat/Jahr bleiben —
// die braucht das Modell für Lücken und Verweildauern).
const FULL_DATE = /\b\d{1,2}\.\s?\d{1,2}\.\s?\d{2,4}\b/g
// Deutsche/österreichische Straßenangaben mit Hausnummer.
const STREET = /\b[A-ZÄÖÜ][\wäöüß.-]*[\s-]?(?:straße|strasse|str\.|gasse|weg|platz|allee|ring)\s+\d+\s*[a-zA-Z]?\b/gi
// PLZ + Ort (der Ort selbst bleibt für Standort-Matching relevant → nur PLZ weg).
const POSTCODE = /\b\d{4,5}(?=\s+[A-ZÄÖÜ])/g

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Ersetzt direkte Identifikatoren in einem Text durch Platzhalter.
 * Reihenfolge ist relevant: erst die bekannten Eigennamen, dann die Muster.
 */
export function anonymizeText(input: string | null | undefined, opts: AnonymizeOptions = {}): string {
  if (!input) return ""
  let out = input

  // 1) Bekannte Eigennamen (Bewerber, Arbeitgeber) — inkl. einzelner Bestandteile.
  const names = (opts.names || []).filter((n): n is string => !!n && n.trim().length > 2)
  for (const name of names) {
    const full = name.trim()
    out = out.replace(new RegExp(escapeRegex(full), "gi"), "[NAME]")
    for (const part of full.split(/\s+/)) {
      if (part.length > 2) out = out.replace(new RegExp(`\\b${escapeRegex(part)}\\b`, "gi"), "[NAME]")
    }
  }

  // 2) Musterbasierte Identifikatoren.
  out = out
    .replace(EMAIL, "[EMAIL]")
    .replace(URL, "[URL]")
    .replace(IBAN, "[IBAN]")
    .replace(STREET, "[ADRESSE]")
    .replace(PHONE, (m) => (m.replace(/\D/g, "").length >= 8 ? "[TELEFON]" : m))
    .replace(FULL_DATE, "[DATUM]")
    .replace(POSTCODE, "[PLZ]")

  return out.replace(/\[NAME\](\s*\[NAME\])+/g, "[NAME]").trim()
}

/** Rekursive Pseudonymisierung beliebiger JSON-Strukturen (Dossier, Detail …). */
export function anonymizeDeep<T>(value: T, opts: AnonymizeOptions = {}): T {
  if (typeof value === "string") return anonymizeText(value, opts) as unknown as T
  if (Array.isArray(value)) return value.map((v) => anonymizeDeep(v, opts)) as unknown as T
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      // Felder, die reine Identifikatoren sind, fliegen ganz raus.
      if (/^(full_name|name|email|phone|company|linkedin|address|photo_url|resume_path|cover_letter_path)$/i.test(k)) {
        continue
      }
      out[k] = anonymizeDeep(v, opts)
    }
    return out as unknown as T
  }
  return value
}

/**
 * Letzte Sicherheitsschleife vor dem Export: Findet der Scan noch klar
 * personenbezogene Muster, wird das Beispiel verworfen statt exportiert.
 * Lieber ein Datensatz weniger als ein Datenschutzvorfall.
 */
export function containsLikelyPii(text: string): boolean {
  // Frische Instanzen: /g-Regexe merken sich lastIndex und liefern sonst
  // abwechselnd falsche Ergebnisse.
  const email = /\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/
  const iban = /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/
  const phone = /(\+?\d[\d\s()/.-]{7,}\d)/
  return email.test(text) || iban.test(text) || phone.test(text)
}
