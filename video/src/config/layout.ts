import { useVideoConfig } from "remotion"

/**
 * Bildausschnitte pro Format. Beide Compositions spielen dieselben Szenen,
 * jede Szene hat aber ihren eigenen Ausschnitt (Vollbild, Nah, Totale, zentriert).
 */
export interface Layout {
  format: "landscape" | "square"
  W: number
  H: number
  /** seitlicher Sicherheitsabstand für Text */
  margin: number

  hook: { size: number; maxW: number }

  card: { w: number; h: number }
  problem: {
    stack: { x: number; y: number }
    counter: { x: number; y: number; size: number }
    /** Zähler in der Rückfahrt: groß */
    big: { x: number; y: number; size: number }
    stackBack: { x: number; y: number; scale: number }
    textY: number
    textSize: number
    textW: number
    rest: { x: number; y: number }
  }

  grid: { cols: number; rows: number; gap: number; maxH: number }
  scan: { zoom: number; textSize: number }

  list: { w: number; rows: number; rowH: number; gap: number; captionSize: number }
  detail: {
    panel: { x: number; y: number; w: number; h: number }
    evidence: number
    fs: number
    ring: number
    text: { x: number; y: number; size: number; w: number }
  }

  payoff: { cardW: number; gap: number; y: number; textY: number; textSize: number }
  logo: { w: number; y: number; tagline: number; cta: number }
}

const LANDSCAPE: Layout = {
  format: "landscape",
  W: 1920,
  H: 1080,
  margin: 140,
  hook: { size: 104, maxW: 1480 },
  card: { w: 300, h: 380 },
  problem: {
    stack: { x: 1060, y: 500 },
    counter: { x: 140, y: 930, size: 120 },
    big: { x: 140, y: 600, size: 300 },
    stackBack: { x: 1450, y: 560, scale: 0.62 },
    textY: 140,
    textSize: 84,
    textW: 1500,
    rest: { x: 960, y: 700 },
  },
  grid: { cols: 10, rows: 8, gap: 14, maxH: 960 },
  scan: { zoom: 1.95, textSize: 112 },
  list: { w: 1120, rows: 7, rowH: 92, gap: 12, captionSize: 34 },
  detail: {
    panel: { x: 780, y: 90, w: 1000, h: 900 },
    evidence: 3,
    fs: 19,
    ring: 132,
    text: { x: 140, y: 540, size: 92, w: 560 },
  },
  payoff: { cardW: 360, gap: 40, y: 660, textY: 190, textSize: 76 },
  logo: { w: 880, y: 430, tagline: 56, cta: 28 },
}

const SQUARE: Layout = {
  format: "square",
  W: 1080,
  H: 1080,
  margin: 80,
  hook: { size: 86, maxW: 900 },
  card: { w: 300, h: 380 },
  problem: {
    stack: { x: 540, y: 560 },
    counter: { x: 80, y: 990, size: 96 },
    big: { x: 80, y: 340, size: 240 },
    stackBack: { x: 760, y: 770, scale: 0.5 },
    textY: 100,
    textSize: 70,
    textW: 920,
    rest: { x: 540, y: 700 },
  },
  grid: { cols: 8, rows: 10, gap: 12, maxH: 980 },
  scan: { zoom: 1.55, textSize: 92 },
  list: { w: 920, rows: 5, rowH: 96, gap: 12, captionSize: 30 },
  detail: {
    panel: { x: 80, y: 250, w: 920, h: 760 },
    evidence: 2,
    fs: 20,
    ring: 120,
    text: { x: 80, y: 150, size: 68, w: 920 },
  },
  payoff: { cardW: 290, gap: 22, y: 700, textY: 150, textSize: 62 },
  logo: { w: 760, y: 420, tagline: 48, cta: 25 },
}

export function getLayout(width: number, height: number): Layout {
  return width === height ? SQUARE : LANDSCAPE
}

export function useLayout(): Layout {
  const { width, height } = useVideoConfig()
  return getLayout(width, height)
}
