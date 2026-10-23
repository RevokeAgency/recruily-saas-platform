import React from "react"
import { AbsoluteFill, interpolate } from "remotion"

import { theme } from "../../config/theme"
import { mix, progress, springAt, useClock } from "../../lib/time"
import { pick, shakes, useFmt } from "../kit"
import { HOOK } from "../timing"

/**
 * Beat 1: „Die Beste liegt selten oben." Ein Wort pro Schlag, riesig.
 * Danach kippt „oben." aus der Zeile und schlägt unten im Bild auf.
 */
export const Hook: React.FC = () => {
  const { t, fps } = useClock()
  const { fmt, W, H } = useFmt()

  const layout = pick(fmt, {
    v: { lines: [[0], [1], [2], [3], [4]], size: 268, top: 230, left: 84 },
    s: { lines: [[0, 1], [2, 3], [4]], size: 150, top: 220, left: 84 },
    h: { lines: [[0, 1, 2], [3, 4]], size: 182, top: 300, left: 150 },
  })
  const lh = layout.size * 0.94
  const lastLineTop = layout.top + (layout.lines.length - 1) * lh
  const floor = H - layout.size * 1.18 - pick(fmt, { v: 150, s: 40, h: 40 })
  const drop = floor - lastLineTop

  const cam = shakes(t, [...HOOK.at, HOOK.land], 9)
  const landHit = shakes(t, [HOOK.land], 26)
  const outP = progress(t, HOOK.out, HOOK.out + 0.5, theme.ease.in)
  const settle = progress(t, HOOK.at[4], HOOK.out, theme.ease.inOut)

  const word = (i: number) => {
    const at = HOOK.at[i]
    const p = springAt(t, at, fps, { damping: 13, stiffness: 210, mass: 0.7 })
    const visible = t >= at
    const accent = i === HOOK.accent
    let extra = ""
    if (i === 4) {
      // kippen um die linke Unterkante, dann fallen mit Schwerkraft und kleinem Nachfedern
      const tip = progress(t, HOOK.fall, HOOK.land, theme.ease.gravity)
      const bounce = t > HOOK.land ? Math.exp(-(t - HOOK.land) * 10) * Math.sin((t - HOOK.land) * 30) * 0.05 : 0
      const y = drop * tip
      const rot = interpolate(tip, [0, 0.35, 1], [0, 14, -5])
      const squash = t > HOOK.land ? 1 - bounce : 1
      extra = ` translate(${tip * 30}px, ${y}px) rotate(${rot}deg) scaleY(${squash}) scaleX(${2 - squash})`
    }
    return (
      <span
        key={i}
        style={{
          display: "inline-block",
          marginRight: layout.size * 0.24,
          opacity: visible ? Math.min(1, p * 1.6) : 0,
          filter: `blur(${visible ? mix(Math.min(1, p), 14, 0) : 0}px)`,
          transform: `scale(${mix(Math.min(1.2, p), 1.75, 1)})${extra}`,
          transformOrigin: i === 4 ? "0% 100%" : "50% 60%",
          ...(accent
            ? {
                backgroundImage: theme.color.gradient,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                filter: `blur(${visible ? mix(Math.min(1, p), 14, 0) : 0}px) drop-shadow(0 0 ${30 * settle}px rgba(34,193,238,0.6))`,
              }
            : {}),
        }}
      >
        {HOOK.words[i]}
      </span>
    )
  }

  // Unterstrich in Markenfarbe läuft unter dem Satz mit, bis „oben." fällt
  const bar = progress(t, HOOK.at[0], HOOK.at[4] + 0.3, theme.ease.out) * (1 - progress(t, HOOK.fall, HOOK.land))

  return (
    <AbsoluteFill
      style={{
        transform: `translate(${cam.x + landHit.x}px, ${cam.y + landHit.y}px) scale(${mix(outP, 1 + settle * 0.04, 1.6)})`,
        opacity: 1 - outP,
        filter: outP > 0 ? `blur(${outP * 16}px)` : undefined,
      }}
    >
      {layout.lines.map((line, li) => (
        <div
          key={li}
          style={{
            position: "absolute",
            left: layout.left,
            top: layout.top + li * lh,
            fontFamily: theme.font.display,
            fontWeight: 800,
            fontSize: layout.size,
            lineHeight: 1,
            letterSpacing: "-0.055em",
            color: "#F4FBF8",
            whiteSpace: "nowrap",
          }}
        >
          {line.map((i) => word(i))}
        </div>
      ))}
      <div
        style={{
          position: "absolute",
          left: layout.left,
          top: layout.top + layout.lines.length * lh + 18,
          width: (W - layout.left * 2) * bar,
          height: 10,
          borderRadius: 5,
          background: theme.color.gradient,
          boxShadow: "0 0 30px rgba(34,193,238,0.6)",
        }}
      />
    </AbsoluteFill>
  )
}
