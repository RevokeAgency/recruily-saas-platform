import React from "react"
import { AbsoluteFill } from "remotion"

import { theme } from "../../config/theme"
import { mix, progress, springAt, useClock } from "../../lib/time"
import { pick, shakes, useFmt } from "../../showreel/kit"
import { HOOK } from "../timing"

/** Wohin jedes Wort beim Auseinanderfliegen kippt (px, Grad), fest statt zufällig. */
const SCATTER: [number, number, number][] = [
  [-60, 520, -24],
  [120, 410, 17],
  [-30, 300, -9],
  [160, 160, 21],
  [-90, 40, -13],
]

/**
 * Beat 1: „Zu viele Bewerbungen, null Überblick." Ein Wort pro Schlag, jede Zeile
 * so groß, wie sie ins Bild passt. Danach kippt der Satz wie ein Stapel ohne Ordnung.
 */
export const Hook: React.FC = () => {
  const { t, fps } = useClock()
  const { fmt, H } = useFmt()
  // Wurfweite am Hochformat ausgelegt, in flacheren Formaten kürzer
  const reach = H / 1920

  const L = pick(fmt, {
    v: { lines: [{ w: [0, 1], size: 205 }, { w: [2], size: 140 }, { w: [3], size: 360 }, { w: [4], size: 172, pad: 60 }], top: 470, left: 72, gap: 0.95 },
    s: { lines: [{ w: [0, 1], size: 150 }, { w: [2], size: 146 }, { w: [3, 4], size: 128, pad: 20 }], top: 290, left: 80, gap: 1.0 },
    h: { lines: [{ w: [0, 1, 2], size: 150 }, { w: [3, 4], size: 168, pad: 20 }], top: 360, left: 150, gap: 1.0 },
  })

  const scatter = progress(t, HOOK.scatter, HOOK.land + 0.2, theme.ease.out)
  const cam = shakes(t, HOOK.at, 9)
  const hit = shakes(t, [HOOK.land], 22)
  const outP = progress(t, HOOK.out, HOOK.out + 0.5, theme.ease.in)

  const tops: number[] = []
  let y = L.top
  for (const line of L.lines) {
    y += "pad" in line ? (line.pad ?? 0) : 0
    tops.push(y)
    y += line.size * L.gap
  }

  const word = (i: number, size: number) => {
    const at = HOOK.at[i]
    const p = springAt(t, at, fps, { damping: 13, stiffness: 210, mass: 0.7 })
    const q = Math.min(1, p)
    const visible = t >= at
    const [sx, sy, sr] = SCATTER[i]
    const accent = i === HOOK.accent
    const blur = visible ? mix(q, 14, 0) : 0
    return (
      <span
        key={i}
        style={{
          display: "inline-block",
          marginRight: size * 0.22,
          opacity: visible ? Math.min(1, p * 1.6) : 0,
          transform: `translate(${sx * scatter * reach}px, ${sy * scatter * reach}px) rotate(${sr * scatter}deg) scale(${mix(Math.min(1.2, p), 1.8, 1)})`,
          transformOrigin: "50% 60%",
          filter: accent ? `blur(${blur}px) drop-shadow(0 0 30px rgba(34,193,238,0.55))` : `blur(${blur}px)`,
          ...(accent ? { backgroundImage: theme.color.gradient, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" } : {}),
        }}
      >
        {HOOK.words[i]}
      </span>
    )
  }

  return (
    <AbsoluteFill
      style={{
        transform: `translate(${cam.x + hit.x}px, ${cam.y + hit.y}px) scale(${mix(outP, 1, 1.6)})`,
        opacity: 1 - outP,
        filter: outP > 0 ? `blur(${outP * 16}px)` : undefined,
      }}
    >
      {L.lines.map((line, li) => (
        <div
          key={li}
          style={{
            position: "absolute",
            left: L.left,
            top: tops[li],
            fontFamily: theme.font.display,
            fontWeight: 800,
            fontSize: line.size,
            lineHeight: 1,
            letterSpacing: "-0.055em",
            color: "#F4FBF8",
            whiteSpace: "nowrap",
          }}
        >
          {line.w.map((i) => word(i, line.size))}
        </div>
      ))}
    </AbsoluteFill>
  )
}
