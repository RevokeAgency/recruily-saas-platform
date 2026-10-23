import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"

import { theme } from "../config/theme"

type EasingFn = (t: number) => number
type SpringConfig = { damping: number; stiffness: number; mass: number }

/** Aktuelle Zeit in Sekunden plus fps. Alle Zeiten im Projekt hängen hieran. */
export function useClock(): { t: number; fps: number } {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  return { t: frame / fps, fps }
}

/**
 * Fortschritt 0..1 zwischen zwei Zeitpunkten (Sekunden).
 * Immer geclampt, immer mit Easing. Lineares Easing gibt es hier nicht.
 */
export function progress(t: number, from: number, to: number, easing: EasingFn = theme.ease.out): number {
  if (to <= from) return t >= to ? 1 : 0
  return interpolate(t, [from, to], [0, 1], { easing, extrapolateLeft: "clamp", extrapolateRight: "clamp" })
}

/** Spring ab Zeitpunkt `start` (Sekunden), 0 davor. */
export function springAt(t: number, start: number, fps: number, config: SpringConfig = theme.spring.smooth): number {
  if (t < start) return 0
  return spring({ frame: (t - start) * fps, fps, config })
}

export function mix(p: number, a: number, b: number): number {
  return a + (b - a) * p
}

/** Abgangsdauer: ~10 Frames bei 30 fps. Auftritte brauchen etwa doppelt so lang. */
export const EXIT = 0.33

/**
 * Standard-Auftritt per Spring (Deckkraft + Versatz + Maßstab + Unschärfe)
 * und schnellerer Abgang mit Easing. `end` = Zeitpunkt, an dem das Element
 * weg sein soll. Ohne `end` bleibt es stehen.
 */
export function enter(
  t: number,
  fps: number,
  start: number,
  end = Number.POSITIVE_INFINITY,
  opts: { rise?: number; exitRise?: number; scaleFrom?: number; config?: SpringConfig } = {},
): { opacity: number; y: number; scale: number; blur: number; p: number } {
  const { rise = 30, exitRise = -18, scaleFrom = 0.96, config = theme.spring.snappy } = opts
  const pin = springAt(t, start, fps, config)
  const pout = progress(t, end - EXIT, end, theme.ease.in)
  return {
    opacity: Math.min(1, pin) * (1 - pout),
    y: mix(pin, rise, 0) + mix(pout, 0, exitRise),
    scale: mix(pin, scaleFrom, 1) * mix(pout, 1, 0.98),
    blur: Math.max(0, mix(Math.min(1, pin), 8, 0)) + mix(pout, 0, 6),
    p: pin,
  }
}

/** Atmen für Elemente, die länger als 2 s stehen: kleine Sinusbewegung. */
export function breathe(t: number, amount = 1, speed = 1): { scale: number; y: number } {
  return {
    scale: 1 + Math.sin(t * 1.9 * speed) * 0.006 * amount,
    y: Math.sin(t * 1.3 * speed + 0.7) * 3 * amount,
  }
}

/** Zeitfenster [from, to): sonst nicht rendern. */
export function within(t: number, from: number, to: number): boolean {
  return t >= from && t < to
}
