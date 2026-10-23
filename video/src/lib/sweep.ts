import type { Layout } from "../config/layout"
import { at, CUES } from "../config/timeline"
import { theme } from "../config/theme"
import { mix, progress } from "./time"

/** Breite des Verlaufsbands in Szene 4. */
export function bandWidth(L: Layout): number {
  return L.format === "landscape" ? 380 : 300
}

/** Mittelpunkt (x) des Verlaufsbands zum Zeitpunkt t. Läuft über das ganze Bild. */
export function bandX(L: Layout, t: number): number {
  const p = progress(t, at("erfassen", CUES.erfassen.sweepStart), at("erfassen", CUES.erfassen.sweepEnde), theme.ease.inOut)
  const w = bandWidth(L)
  return mix(p, -w, L.width + w)
}

/** Wie weit eine Stelle x vom Band schon erfasst ist (0..1). */
export function capturedAt(L: Layout, t: number, x: number): number {
  const passed = bandX(L, t) - x
  const soft = bandWidth(L) * 0.45
  const p = Math.min(1, Math.max(0, passed / soft))
  return theme.ease.out(p)
}
