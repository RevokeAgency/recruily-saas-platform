import React from "react"
import { AbsoluteFill, useCurrentFrame } from "remotion"

import { theme } from "../config/theme"
import { at } from "../config/timing"
import { progress, useClock } from "../lib/time"

/**
 * Ebene 1: Near-Black mit weichem Mesh aus Mid-Teal, das langsam wandert.
 * Im Hook fast schwarz, ab dem Schnitt bei 4 s voll da.
 */
export const Mesh: React.FC<{ dimUntil?: number }> = ({ dimUntil = at("problem") }) => {
  const { t } = useClock()
  // Bis dimUntil bleibt die Bühne nahezu schwarz (im Launch-Video: der Hook)
  const level = 0.18 + 0.82 * progress(t, dimUntil, dimUntil + 0.6)

  const blob = (cx: number, cy: number, r: number, alpha: number, key: string) => (
    <div
      key={key}
      style={{
        position: "absolute",
        left: `${cx}%`,
        top: `${cy}%`,
        width: `${r}%`,
        aspectRatio: "1",
        transform: "translate(-50%, -50%)",
        borderRadius: "50%",
        background: `radial-gradient(circle, rgba(43,97,105,${alpha * level}) 0%, rgba(43,97,105,${alpha * level * 0.45}) 35%, rgba(43,97,105,0) 70%)`,
      }}
    />
  )

  return (
    <AbsoluteFill style={{ background: theme.color.stage, overflow: "hidden" }}>
      {blob(22 + Math.sin(t * 0.21) * 10, 18 + Math.cos(t * 0.17) * 8, 95, 0.75, "a")}
      {blob(82 + Math.cos(t * 0.15) * 9, 78 + Math.sin(t * 0.19) * 9, 85, 0.6, "b")}
      {blob(60 + Math.sin(t * 0.12 + 2) * 14, 35 + Math.cos(t * 0.23 + 1) * 10, 60, 0.35, "c")}
    </AbsoluteFill>
  )
}

/** Ebene 4: Color Grade über allem Inhalt, unter Korn und Vignette. */
export const Grade: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <AbsoluteFill style={{ backgroundColor: theme.color.teal, mixBlendMode: "soft-light", opacity: 0.22 }} />
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, rgba(0,0,0,0.14) 0%, rgba(0,0,0,0) 26%, rgba(0,0,0,0) 72%, rgba(0,0,0,0.2) 100%)",
      }}
    />
  </AbsoluteFill>
)

const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='256' height='256' filter='url(%23n)'/%3E%3C/svg%3E\")"

/** Ebene 5a: Korn, springt jedes Frame an eine neue Stelle. */
export const Grain: React.FC = () => {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        backgroundImage: NOISE,
        backgroundSize: "256px 256px",
        backgroundPosition: `${(frame * 73) % 256}px ${(frame * 137) % 256}px`,
        mixBlendMode: "overlay",
        opacity: 0.16,
      }}
    />
  )
}

/** Ebene 5b: Vignette, ganz oben. */
export const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      pointerEvents: "none",
      background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 58%, rgba(0,0,0,0.38) 100%)",
    }}
  />
)
