/**
 * Einzige Quelle für Farben, Schriften, Bewegungskurven und Springs.
 * Keine Hex-Werte, Easings oder Spring-Werte direkt in Komponenten.
 */
import { Easing } from "remotion"

export const theme = {
  color: {
    // Bühne
    stage: "#081314",
    teal: "#2B6169",
    text: "#E8F2F2",
    textDim: "rgba(232, 242, 242, 0.55)",
    textFaint: "rgba(232, 242, 242, 0.32)",

    // Akzente. Pro Bild leuchtet höchstens EIN Element (siehe glow()).
    cyan: "#22C1EE",
    green: "#16C77C",
    greenDeep: "#0E9F62",
    cyanDeep: "#0E96C4",
    gradient: "linear-gradient(130deg, #22C1EE 0%, #16C77C 100%)",

    // Helle Produkt-UI, liegt als Panel auf der Bühne
    card: "#FFFFFF",
    ink: "#0C1A16",
    muted: "#F1F3F5",
    mutedFg: "#667085",
    body: "#475467",
    border: "rgba(12, 26, 22, 0.08)",
    greenWash: "#EAFBF3",
    amber: "#F59E0B",
    red: "#EF4444",
    skeleton: "#E9EDF0",
  },
  /** Panels auf dunkler Bühne: weicher Schatten, leichter heller Rand. */
  panel: {
    shadow: "0 40px 80px -24px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.10)",
    shadowSmall: "0 18px 36px -14px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.10)",
  },
  font: {
    display: "'Plus Jakarta Sans', system-ui, sans-serif",
    support: "'Montserrat', system-ui, sans-serif",
  },
  ease: {
    out: Easing.bezier(0.16, 1, 0.3, 1), //   Auftritte
    inOut: Easing.bezier(0.65, 0, 0.35, 1), // Bewegungen
    in: Easing.bezier(0.7, 0, 0.84, 0), //     nur Abgänge
    gravity: Easing.bezier(0.5, 0, 0.9, 0.6), // Fallen
  },
  spring: {
    snappy: { damping: 16, stiffness: 170, mass: 0.6 }, // Wörter, kleine UI
    smooth: { damping: 22, stiffness: 95, mass: 1 }, //   große Elemente, Kamera
    swap: { damping: 15, stiffness: 120, mass: 0.9 }, //  Zeilentausch, leichtes Nachschwingen
    soft: { damping: 26, stiffness: 70, mass: 1.1 }, //   ruhige Fahrten
    logo: { damping: 12, stiffness: 140, mass: 0.8 }, //  Logo-Teile
  },
} as const

/** Glow für das eine Hero-Element im Bild. */
export function glow(color: string = theme.color.cyan, strength = 1): string {
  const a = (x: number) => Math.round(Math.max(0, Math.min(1, x * strength)) * 255).toString(16).padStart(2, "0")
  return `0 0 28px ${color}${a(0.55)}, 0 0 80px ${color}${a(0.3)}`
}

/** Score-Farbe wie in der App: grün ab 80, amber ab 60, sonst rot. */
export function scoreColor(score: number): string {
  if (score >= 80) return theme.color.green
  if (score >= 60) return theme.color.amber
  return theme.color.red
}

export function scoreTextColor(score: number): string {
  if (score >= 80) return theme.color.greenDeep
  if (score >= 60) return theme.color.amber
  return theme.color.red
}
