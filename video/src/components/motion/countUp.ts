import { springAt } from "../../lib/time"

/**
 * Zählt per spring von 0 auf `target` und steht danach exakt auf `target`.
 * Gerundet wird nur während der Bewegung; sobald die Feder praktisch ruht,
 * gilt der Zielwert, damit nie ein Wert wie 93 statt 94 stehen bleibt.
 */
export function countUp(t: number, start: number, fps: number, target: number): number {
  if (t < start) return 0
  const p = springAt(t, start, fps, { damping: 26, stiffness: 70, mass: 1 })
  if (p > 0.995 || t > start + 1.6) return target
  return Math.min(target, Math.round(p * target))
}
