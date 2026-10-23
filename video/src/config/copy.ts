/** Alle Texte auf Bild an einer Stelle. */
export const COPY = {
  frage: "Wie viele Bewerbungen hast du wirklich gelesen?",
  /** Dieses Wort bekommt den Cyan-Strich. */
  frageBetont: "wirklich",
  bewerbungen: "Bewerbungen.",
  rechnung: "× 15 Minuten",
  stunden: { zahl: 20, wort: "Stunden." },
  zerfall: "Gründlich gelesen werden die wenigsten.",
  scan: { marke: "Revetly", rest: "liest alle." },
  liste: "Sortiert nach Passung.",
  detail: "Jeder Punkt belegt.",
  payoff: ["Du entscheidest über drei Profile.", "Nicht über achtzig."],
  tagline: "Mehr Zeit für die wichtigen Dinge.",
  cta: { aktion: "Erste Stelle kostenlos testen", url: "www.revetly.ai" },
} as const

/** Texte der Produkt-Demo (Composition "RevetlyDemo"). */
export const DEMO_COPY = {
  intro1: "Recruiting is time-consuming.",
  intro2: "Meet",
  upload1: "Drop in a CV.",
  upload2: "Skills and score in seconds.",
  scoring1: "Every applicant, scored.",
  scoring2: "AI summary at a glance.",
  slogan: "AI-Powered Applicant Tracking",
  cta: "revetly.ai",
  features: ["Smart CV Upload", "Applicant Scoring", "AI Summary"],
} as const
