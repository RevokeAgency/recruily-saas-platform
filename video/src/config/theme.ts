import { Easing } from "remotion"

/**
 * Einzige Quelle für Farben, Schriften und Bewegungskurven.
 * Keine Hex-Werte oder Easings direkt in Komponenten.
 *
 * Brandfarben laut Briefing, App-Farben (Score-Ampel, Rahmen, Muted) aus
 * app/globals.css bzw. den Komponenten übernommen, damit die nachgebaute UI
 * aussieht wie das Produkt.
 */
export const theme = {
  color: {
    cyan: "#22C1EE",
    green: "#16C77C",
    greenDeep: "#0E9F62",
    cyanDeep: "#0E96C4",
    ink: "#081314",
    teal: "#2B6169",
    gradient: "linear-gradient(130deg, #22C1EE 0%, #16C77C 100%)",

    // Hintergrund: weiß mit einem Hauch Markenfarbe aus den oberen Ecken,
    // wie die App-Fläche (--app-canvas).
    paper: "#FBFCFC",
    paperTint:
      "radial-gradient(90% 70% at 100% 0%, rgba(22,199,124,0.07) 0%, rgba(251,252,252,0) 55%), " +
      "radial-gradient(80% 60% at 0% 0%, rgba(34,193,238,0.06) 0%, rgba(251,252,252,0) 50%)",

    // App-UI
    card: "#FFFFFF",
    muted: "#F1F3F5",
    mutedFg: "#667085",
    border: "rgba(12, 26, 22, 0.08)",
    greenWash: "#EAFBF3",
    amber: "#F59E0B",
    red: "#EF4444",
    skeleton: "#E9EDF0",
  },
  shadow: {
    card: "0 1px 2px rgba(12,26,22,.04), 0 14px 32px -14px rgba(12,26,22,.16)",
    lifted: "0 2px 4px rgba(12,26,22,.04), 0 40px 80px -36px rgba(12,26,22,.28)",
  },
  font: {
    display: "'Plus Jakarta Sans', system-ui, sans-serif",
    support: "'Montserrat', system-ui, sans-serif",
  },
  ease: {
    // Eintritte: schnell da, lange auslaufend.
    out: Easing.bezier(0.16, 1, 0.3, 1),
    // Bewegungen von A nach B.
    inOut: Easing.bezier(0.65, 0, 0.35, 1),
    // Nur für Abgänge.
    in: Easing.bezier(0.55, 0, 0.75, 0.2),
  },
} as const

/** Score-Farbe wie in der App: grün ab 80, amber ab 60, sonst rot. */
export function scoreColor(score: number): string {
  if (score >= 80) return theme.color.green
  if (score >= 60) return theme.color.amber
  return theme.color.red
}

/** Textfarbe für Scores wie im Match-Modal (grün tief für gute Werte). */
export function scoreTextColor(score: number): string {
  if (score >= 80) return theme.color.greenDeep
  if (score >= 60) return theme.color.amber
  return theme.color.red
}
