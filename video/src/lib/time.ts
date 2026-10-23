import { interpolate, useCurrentFrame, useVideoConfig } from "remotion"

import { theme } from "../config/theme"

type EasingFn = (t: number) => number

/** Aktuelle Zeit in Sekunden. */
export function useTime(): number {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  return frame / fps
}

/**
 * Fortschritt 0..1 zwischen zwei Zeitpunkten (Sekunden), immer geclampt und
 * immer mit Easing. Lineares Easing gibt es in diesem Projekt nicht.
 */
export function progress(t: number, from: number, to: number, easing: EasingFn = theme.ease.out): number {
  if (to <= from) return t >= to ? 1 : 0
  return interpolate(t, [from, to], [0, 1], {
    easing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
}

/** Lineare Abbildung eines bereits geeasten Fortschritts auf einen Wertebereich. */
export function mix(p: number, a: number, b: number): number {
  return a + (b - a) * p
}

/**
 * Standard-Auftritt: Deckkraft, Versatz und Maßstab zusammen.
 * Abgang ist kürzer als der Auftritt.
 */
export function enterExit(
  t: number,
  start: number,
  end: number,
  opts: { dur?: number; exitDur?: number; rise?: number; exitRise?: number } = {},
): { opacity: number; y: number; scale: number; blur: number } {
  const { dur = 0.55, exitDur = 0.25, rise = 26, exitRise = -14 } = opts
  const pin = progress(t, start, start + dur, theme.ease.out)
  const pout = progress(t, end - exitDur, end, theme.ease.in)
  return {
    opacity: pin * (1 - pout),
    y: mix(pin, rise, 0) + mix(pout, 0, exitRise),
    scale: mix(pin, 0.985, 1),
    blur: mix(pin, 6, 0) + mix(pout, 0, 4),
  }
}
