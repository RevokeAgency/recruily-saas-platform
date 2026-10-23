import { random } from "remotion"

/**
 * DIE EINZIGE QUELLE FÜR BEISPIELDATEN. Alles erfunden.
 * Keine Daten aus der Datenbank, keine echten Personen oder Dokumente.
 * Namen werden aus Vor- und Nachnamenlisten zusammengewürfelt; Ähnlichkeiten
 * mit realen Personen sind zufällig.
 *
 * Scores sind pro Kandidat fix und werden im Video nie hochgezählt oder
 * gerundet angezeigt, sondern immer genau so, wie sie hier stehen.
 * Belegquellen: nur Lebenslauf und Anschreiben.
 */

export const JOB = {
  title: "Teamleitung Kundenservice (m/w/d)",
  short: "Teamleitung Kundenservice",
  total: 80,
}

export interface RankedCandidate {
  /** Index der Bewerbungskarte, die zu dieser Zeile wird */
  applicant: number
  name: string
  initials: string
  years: number
  city: string
  score: number
}

/** Rangliste, absteigend nach Score. */
export const RANKED: readonly RankedCandidate[] = [
  { applicant: 34, name: "Lena Hofbauer", initials: "LH", years: 8, city: "Wien", score: 92 },
  { applicant: 41, name: "Jonas Leitner", initials: "JL", years: 6, city: "Graz", score: 88 },
  { applicant: 45, name: "Mara Steiner", initials: "MS", years: 7, city: "Linz", score: 85 },
  { applicant: 33, name: "Elias Brandl", initials: "EB", years: 5, city: "Wien", score: 81 },
  { applicant: 46, name: "Sophie Auer", initials: "SA", years: 4, city: "St. Pölten", score: 77 },
  { applicant: 36, name: "Felix Moser", initials: "FM", years: 9, city: "Salzburg", score: 72 },
  { applicant: 43, name: "Nina Pichler", initials: "NP", years: 3, city: "Graz", score: 68 },
]

/** Die drei Profile für den Payoff. */
export const TOP3 = RANKED.slice(0, 3)

/**
 * Zwei Zwischenstände beim Sortieren: Rang-Indizes je Platz.
 * unsortiert → teilweise sortiert → RANKED.
 */
export const ORDER_START = [3, 0, 5, 2, 6, 1, 4]
export const ORDER_MID = [0, 3, 2, 1, 5, 4, 6]

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

const initials = (name: string) => name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2)

/** 80 erfundene Bewerbungen, deterministisch. Karten der Rangliste tragen deren Namen. */
export const APPLICANTS: readonly Applicant[] = Array.from({ length: JOB.total }, (_, i) => {
  const ranked = RANKED.find((r) => r.applicant === i)
  if (ranked) return { id: i, name: ranked.name, initials: ranked.initials }
  const name = `${FIRST[Math.floor(random(`first-${i}`) * FIRST.length)]} ${LAST[Math.floor(random(`last-${i}`) * LAST.length)]}`
  return { id: i, name, initials: initials(name) }
})

/** Kriterien und Gewichtungen wie im Match-Modal der App. Gewichtet ergibt das 92. */
export type CriterionIcon =
  | "target" | "briefcase" | "graduation" | "message" | "globe" | "pin" | "building" | "wallet" | "heart"

export interface Criterion {
  key: string
  label: string
  weight: number
  score: number
  icon: CriterionIcon
}

export const CRITERIA: readonly Criterion[] = [
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
export const EVIDENCE: readonly Evidence[] = [
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

// ---------------------------------------------------------------------------
// Produkt-Demo (Composition "RevetlyDemo"). Ebenfalls erfunden.
// Sarah Lindner wird in Szene 2 hochgeladen und steht in Szene 3 mit
// demselben Score an der Spitze der Liste.
// ---------------------------------------------------------------------------

export const DEMO_UPLOAD = {
  name: "Sarah Lindner",
  initials: "SL",
  role: "Customer Success Lead",
  city: "Wien",
  years: 7,
  score: 94,
  file: "Lebenslauf_Sarah_Lindner.pdf",
  skills: ["Teamführung", "Zendesk", "KPI-Steuerung", "Coaching", "Eskalationsmanagement", "Englisch C1"],
  /** KI-Zusammenfassung wie in der App (summary_ai) */
  summary:
    "Sieben Jahre Kundenservice, davon vier in Führungsverantwortung. Hat ein Team von zwölf Personen aufgebaut und die Erstlösungsquote nachweislich gesteigert. Stark in Coaching und Steuerung über Kennzahlen.",
  /** Stellen in der Zusammenfassung, die der Marker hervorhebt (wörtlich aus summary) */
  highlights: ["vier in Führungsverantwortung", "Erstlösungsquote nachweislich gesteigert", "Coaching und Steuerung über Kennzahlen"],
  /** „Warum dieser Kandidat passt" (ai_summary, in der App mit " | " getrennt) */
  pitch: [
    "Führt seit 2021 ein Kundenservice-Team, laut Lebenslauf 12 Mitarbeitende",
    "Erfahrung mit Zendesk und Steuerung über Kennzahlen",
    "Anschreiben beschreibt konkret den Aufbau eines Onboardings",
  ],
} as const

/** Kandidatenliste in Szene 3: die Hochgeladene oben, dann die Rangliste. */
export const DEMO_LIST = [
  { name: DEMO_UPLOAD.name, initials: DEMO_UPLOAD.initials, years: DEMO_UPLOAD.years, city: DEMO_UPLOAD.city, score: DEMO_UPLOAD.score, status: "Bewertet" },
  ...RANKED.slice(0, 5).map((r) => ({ name: r.name, initials: r.initials, years: r.years, city: r.city, score: r.score, status: "Bewertet" })),
] as const

/** Kennzahlen über der Liste (passen zur Liste: alle sichtbaren ≥ 77 %). */
export const DEMO_STATS = [
  { label: "Bewerbungen", value: 80, suffix: "" },
  { label: "Ø Match-Score", value: 74, suffix: " %" },
  { label: "Top-Kandidaten (80 %+)", value: 9, suffix: "" },
] as const
