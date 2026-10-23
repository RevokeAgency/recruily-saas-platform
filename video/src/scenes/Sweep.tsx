import React from "react"
import { AbsoluteFill } from "remotion"

import { useLayout } from "../config/layout"
import { theme } from "../config/theme"
import { at, CUES } from "../config/timeline"
import { bandWidth, bandX } from "../lib/sweep"
import { progress, useTime } from "../lib/time"

/** Szene 4: Der Markenverlauf fährt einmal von links nach rechts durchs Bild. */
export const Sweep: React.FC = () => {
  const L = useLayout()
  const t = useTime()
  const from = at("erfassen", CUES.erfassen.sweepStart)
  const to = at("erfassen", CUES.erfassen.sweepEnde)
  if (t < from || t > to) return null

  const w = bandWidth(L)
  const x = bandX(L, t)
  // weich ein- und ausblenden, damit das Band nicht hart am Rand auftaucht
  const fade = progress(t, from, from + 0.2) * (1 - progress(t, to - 0.2, to, theme.ease.in))

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: x - w / 2,
          top: -L.height * 0.1,
          width: w,
          height: L.height * 1.2,
          backgroundImage: theme.color.gradient,
          opacity: 0.9 * fade,
          transform: "skewX(-8deg)",
          maskImage: "linear-gradient(90deg, transparent 0%, #000 42%, #000 58%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(90deg, transparent 0%, #000 42%, #000 58%, transparent 100%)",
        }}
      />
    </AbsoluteFill>
  )
}
