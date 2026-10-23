import { random } from "remotion"

/**
 * NUR ERFUNDENE BEISPIELDATEN.
 * Keine Daten aus der Datenbank, keine echten Personen oder Dokumente.
 * Namen werden aus Vor- und Nachnamenlisten zusammengewürfelt; Ähnlichkeiten
 * mit realen Personen sind zufällig.
 */

export const JOB = {
  title: "Teamleitung Kundenservice (m/w/d)",
  short: "Teamleitung Kundenservice",
  total: 80,
}

const FIRST = [
  "Lena", "Jonas", "Sophie", "Elias", "Mara", "David", "Nina", "Felix", "Hannah", "Lukas",
  "Clara", "Tobias", "Emilia", "Moritz", "Laura", "Simon", "Julia", "Paul", "Anna", "Florian",
]
const LAST = [
  "Hofbauer", "Wagner", "Leitner", "Brandl", "Steiner", "Auer", "Pichler", "Moser", "Gruber", "Huber",
  "Lindner", "Fuchs", "Berger", "Winkler", "Haas", "Eder", "Schwarz", "Reiter", "Mayr", "Kogler",
]

export interface Applicant {
  id: number
  name: string
  initials: string
}

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2)
}

/** 80 erfundene Bewerbungen, deterministisch (gleicher Seed, gleiche Namen). */
export const APPLICANTS: Applicant[] = Array.from({ length: JOB.total }, (_, i) => {
  const f = FIRST[Math.floor(random(`first-${i}`) * FIRST.length)]
  const l = LAST[Math.floor(random(`last-${i}`) * LAST.length)]
  const name = `${f} ${l}`
  return { id: i, name, initials: initials(name) }
})

export interface RankedCandidate {
  /** Index in APPLICANTS — diese Karte wird zur Listenzeile. */
  applicant: number
  name: string
  initials: string
  years: number
  city: string
  score: number
}

/**
 * Die sichtbaren Zeilen der Rangfolge, absteigend nach Score.
 * Die Namen überschreiben die gewürfelten Namen der zugehörigen Karten.
 */
export const RANKED: RankedCandidate[] = [
  { applicant: 79, name: "Lena Hofbauer", initials: "LH", years: 8, city: "Wien", score: 92 },
  { applicant: 41, name: "Jonas Leitner", initials: "JL", years: 6, city: "Graz", score: 88 },
  { applicant: 12, name: "Mara Steiner", initials: "MS", years: 7, city: "Linz", score: 85 },
  { applicant: 63, name: "Elias Brandl", initials: "EB", years: 5, city: "Wien", score: 81 },
  { applicant: 27, name: "Sophie Auer", initials: "SA", years: 4, city: "St. Pölten", score: 77 },
  { applicant: 55, name: "Felix Moser", initials: "FM", years: 9, city: "Salzburg", score: 72 },
  { applicant: 5, name: "Nina Pichler", initials: "NP", years: 3, city: "Graz", score: 68 },
]

/** Reihenfolge, in der die Zeilen zuerst (unsortiert) erscheinen: Indizes in RANKED. */
export const UNSORTED_ORDER = [3, 0, 5, 2, 6, 1, 4]

// Die ausgewählten Karten tragen die Namen der Rangfolge.
for (const r of RANKED) {
  APPLICANTS[r.applicant] = { id: r.applicant, name: r.name, initials: r.initials }
}

/**
 * Kriterien wie im Match-Modal der App (candidate-match-modal.tsx), mit
 * denselben Gewichtungen. Scores für Lena Hofbauer, gewichtet ergibt das 92.
 */
export type CriterionIcon =
  | "target" | "briefcase" | "graduation" | "message" | "globe" | "pin" | "building" | "wallet" | "heart"

export interface Criterion {
  key: string
  label: string
  weight: number
  score: number
  icon: CriterionIcon
}

export const CRITERIA: Criterion[] = [
  { key: "hardSkills", label: "Hard Skills", weight: 25, score: 94, icon: "target" },
  { key: "experience", label: "Berufserfahrung", weight: 20, score: 95, icon: "briefcase" },
  { key: "education", label: "Ausbildung", weight: 10, score: 85, icon: "graduation" },
  { key: "softSkills", label: "Soft Skills", weight: 10, score: 90, icon: "message" },
  { key: "languages", label: "Sprachen", weight: 5, score: 100, icon: "globe" },
  { key: "location", label: "Standort", weight: 5, score: 100, icon: "pin" },
  { key: "industry", label: "Branche", weight: 10, score: 88, icon: "building" },
  { key: "salary", label: "Gehalt", weight: 5, score: 80, icon: "wallet" },
  { key: "culture", label: "Kultur", weight: 10, score: 90, icon: "heart" },
]

export interface Evidence {
  criterion: string
  begruendung: string
  quelle: "Lebenslauf" | "Anschreiben"
  zitat: string
}

/** Begründung pro Kriterium mit wörtlichem Beleg (erfunden). */
export const EVIDENCE: Evidence[] = [
  {
    criterion: "experience",
    begruendung: "Sechs Jahre Führung eines Kundenservice-Teams, zuletzt mit 14 Mitarbeitenden.",
    quelle: "Lebenslauf",
    zitat: "2019–2025 Teamleitung Kundenservice, verantwortlich für 14 Mitarbeitende im Schichtbetrieb",
  },
  {
    criterion: "hardSkills",
    begruendung: "Ticketsysteme und Steuerung über Kennzahlen sind mit Ergebnis belegt.",
    quelle: "Lebenslauf",
    zitat: "Einführung eines neuen Ticketsystems, Bearbeitungszeit um 22 % gesenkt",
  },
  {
    criterion: "softSkills",
    begruendung: "Coaching und Einarbeitung neuer Kolleg:innen mit konkretem Beispiel beschrieben.",
    quelle: "Anschreiben",
    zitat: "Ich habe ein Mentoring-Programm für neue Kolleginnen und Kollegen aufgebaut.",
  },
]
