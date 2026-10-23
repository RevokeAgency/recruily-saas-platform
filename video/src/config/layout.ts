import { useVideoConfig } from "remotion"

/**
 * Layout pro Format. Beide Compositions spielen dieselben Szenen, nur Text-
 * und Bühnenbereich sowie die UI-Größen unterscheiden sich.
 *
 * 16:9  Text links, Bühne (UI) rechts.
 * 1:1   Text oben, Bühne darunter.
 */
export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export interface Layout {
  format: "landscape" | "square"
  width: number
  height: number
  caption: Box & { align: "center" | "top"; size: number; eyebrow: number }
  stage: Box
  /** Bewerbungskarte im Stapel (Grundgröße, wird im Raster skaliert). */
  card: { w: number; h: number }
  grid: { cols: number; rows: number; gap: number }
  list: { rows: number; rowH: number; headerH: number; footerH: number; gap: number }
  /** Detailansicht in Szene 6: Oberkante, Höhe, Grundschriftgröße. */
  panel: { evidence: number; ring: number; top: number; h: number; fs: number }
  outro: { logoW: number; tagline: number; cta: number }
}

const LANDSCAPE: Layout = {
  format: "landscape",
  width: 1920,
  height: 1080,
  caption: { x: 150, y: 0, w: 700, h: 1080, align: "center", size: 80, eyebrow: 30 },
  stage: { x: 910, y: 110, w: 860, h: 860 },
  card: { w: 300, h: 380 },
  grid: { cols: 10, rows: 8, gap: 12 },
  list: { rows: 7, rowH: 86, headerH: 74, footerH: 64, gap: 8 },
  panel: { evidence: 3, ring: 132, top: 125, h: 830, fs: 17.5 },
  outro: { logoW: 720, tagline: 54, cta: 28 },
}

const SQUARE: Layout = {
  format: "square",
  width: 1080,
  height: 1080,
  caption: { x: 80, y: 70, w: 920, h: 230, align: "top", size: 64, eyebrow: 26 },
  stage: { x: 80, y: 310, w: 920, h: 720 },
  card: { w: 290, h: 366 },
  grid: { cols: 10, rows: 8, gap: 10 },
  list: { rows: 5, rowH: 94, headerH: 76, footerH: 60, gap: 10 },
  panel: { evidence: 2, ring: 120, top: 325, h: 672, fs: 19.5 },
  outro: { logoW: 620, tagline: 46, cta: 25 },
}

export function getLayout(width: number, height: number): Layout {
  return width === height ? SQUARE : LANDSCAPE
}

export function useLayout(): Layout {
  const { width, height } = useVideoConfig()
  return getLayout(width, height)
}
