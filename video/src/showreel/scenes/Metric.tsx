import React from "react"
import { AbsoluteFill, interpolate } from "remotion"

import { theme } from "../../config/theme"
import { mix, progress, springAt, useClock } from "../../lib/time"
import { pick, shakes, useFmt } from "../kit"
import { COPY, METRIC, SCENE } from "../timing"

/** Beat 6: eine Zahl. Rollt auf dem Downbeat bis zum Wert hoch und schlägt ein. */
export const Metric: React.FC = () => {
  const { t, fps } = useClock()
  const { fmt, W } = useFmt()
  const { to } = SCENE.metric
  const m = COPY.metric

  const L = pick(fmt, {
    v: { num: { x: W / 2, y: 820, size: 980, anchor: "center" as const }, text: { x: 0, y: 1260, w: W, size: 150, sub: 62, align: "center" as const } },
    s: { num: { x: 330, y: 560, size: 760, anchor: "center" as const }, text: { x: 560, y: 330, w: 480, size: 132, sub: 54, align: "left" as const } },
    h: { num: { x: 640, y: 560, size: 900, anchor: "center" as const }, text: { x: 960, y: 360, w: 820, size: 168, sub: 64, align: "left" as const } },
  })

  const roll = progress(t, METRIC.slam, METRIC.slam + 0.42, theme.ease.out)
  const value = Math.max(1, Math.round(mix(roll, 1, m.value)))
  const slam = springAt(t, METRIC.slam, fps, { damping: 11, stiffness: 200, mass: 0.8 })
  const land = METRIC.slam + 0.42
  const cam = shakes(t, [METRIC.slam, land], 18)
  const outP = progress(t, METRIC.out, to, theme.ease.in)

  const ring = (delay: number) => {
    const p = progress(t, land + delay, land + delay + 0.8, theme.ease.out)
    if (p <= 0 || p >= 1) return null
    const r = mix(p, L.num.size * 0.25, L.num.size * 0.95)
    return (
      <div
        key={delay}
        style={{
          position: "absolute",
          left: L.num.x - r,
          top: L.num.y - r,
          width: r * 2,
          height: r * 2,
          borderRadius: "50%",
          border: `${mix(p, 10, 1)}px solid rgba(34,193,238,${1 - p})`,
          boxShadow: `0 0 50px rgba(22,199,124,${(1 - p) * 0.6})`,
        }}
      />
    )
  }

  const line = (text: string, at: number, size: number, weight: number, color: string) => {
    const p = springAt(t, at, fps, theme.spring.snappy)
    return (
      <div
        style={{
          fontFamily: theme.font.display,
          fontWeight: weight,
          fontSize: size,
          lineHeight: 1.05,
          letterSpacing: "-0.04em",
          color,
          opacity: Math.min(1, p * 1.5),
          transform: `translateY(${mix(Math.min(1, p), 60, 0)}px)`,
          filter: `blur(${mix(Math.min(1, p), 10, 0)}px)`,
        }}
      >
        {text}
      </div>
    )
  }

  return (
    <AbsoluteFill
      style={{
        transform: `translate(${cam.x}px, ${cam.y}px)`,
        opacity: 1 - outP,
      }}
    >
      {ring(0)}
      {ring(0.18)}
      <div
        style={{
          position: "absolute",
          left: L.num.x - L.num.size,
          top: L.num.y - L.num.size * 0.56,
          width: L.num.size * 2,
          textAlign: "center",
          fontFamily: theme.font.display,
          fontWeight: 800,
          fontSize: L.num.size,
          lineHeight: 1.1,
          letterSpacing: "-0.08em",
          backgroundImage: theme.color.gradient,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          transform: `scale(${mix(Math.min(1.15, slam), 2.6, 1) * mix(outP, 1, 5)}) rotate(${interpolate(Math.min(1, slam), [0, 1], [-14, 0])}deg)`,
          filter: `blur(${mix(Math.min(1, slam), 22, 0)}px) drop-shadow(0 0 60px rgba(34,193,238,0.45))`,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      <div style={{ position: "absolute", left: L.text.x, top: L.text.y, width: L.text.w, textAlign: L.text.align }}>
        {line(m.unit, METRIC.label, L.text.size, 800, "#F4FBF8")}
        <div style={{ height: L.text.sub * 0.5 }} />
        {line(m.label, METRIC.sub, L.text.sub, 600, "rgba(232,242,242,0.75)")}
        {line(m.sub, METRIC.sub + 0.25, L.text.sub, 600, "rgba(232,242,242,0.75)")}
      </div>
    </AbsoluteFill>
  )
}
