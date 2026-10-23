import React from "react"
import { AbsoluteFill, interpolate } from "remotion"

import { theme } from "../../config/theme"
import { mix, progress, springAt, useClock } from "../../lib/time"
import { CARD_SHADOW, pick, shakes, Shot, useFmt } from "../../showreel/kit"
import meta from "../../../public/showreel/dashboard/dashboard.json"
import { COPY, METRIC, SCENE } from "../timing"

const Q = meta.cards.quality

/**
 * Beat 6: die Zahl aus der Karte „Match-Qualität". Rollt auf dem Downbeat hoch und
 * schlägt ein; danach kommt die echte Karte, aus der sie stammt.
 */
export const Metric: React.FC = () => {
  const { t, fps } = useClock()
  const { fmt, W } = useFmt()
  const { to } = SCENE.metric
  const m = COPY.metric

  const L = pick(fmt, {
    v: { num: { x: W / 2, y: 560, size: 400 }, text: { x: 0, y: 820, w: W, size: 84, sub: 50, align: "center" as const }, card: { x: (W - Q.w * 1.6) / 2, y: 1130, k: 1.6 } },
    s: { num: { x: W / 2, y: 420, size: 380 }, text: { x: 0, y: 680, w: W, size: 76, sub: 46, align: "center" as const }, card: null },
    h: { num: { x: 560, y: 430, size: 380 }, text: { x: 140, y: 690, w: 840, size: 82, sub: 48, align: "center" as const }, card: { x: 1110, y: (1080 - Q.h * 1.6) / 2, k: 1.6 } },
  })

  const roll = progress(t, METRIC.slam, METRIC.slam + 0.42, theme.ease.out)
  const value = mix(roll, 1, m.value).toFixed(1)
  const slam = springAt(t, METRIC.slam, fps, { damping: 11, stiffness: 200, mass: 0.8 })
  const land = METRIC.slam + 0.42
  const cam = shakes(t, [METRIC.slam, land], 18)
  const outP = progress(t, METRIC.out, to, theme.ease.in)
  const cardP = springAt(t, METRIC.card, fps, theme.spring.smooth)

  const ring = (delay: number) => {
    const p = progress(t, land + delay, land + delay + 0.8, theme.ease.out)
    if (p <= 0 || p >= 1) return null
    const r = mix(p, L.num.size * 0.3, L.num.size * 1.3)
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
          lineHeight: 1.1,
          letterSpacing: "-0.035em",
          color,
          opacity: Math.min(1, p * 1.5),
          transform: `translateY(${mix(Math.min(1, p), 50, 0)}px)`,
          filter: `blur(${mix(Math.min(1, p), 10, 0)}px)`,
        }}
      >
        {text}
      </div>
    )
  }

  return (
    <AbsoluteFill style={{ transform: `translate(${cam.x}px, ${cam.y}px)`, opacity: 1 - outP }}>
      {ring(0)}
      {ring(0.18)}
      <div
        style={{
          position: "absolute",
          left: L.num.x - L.num.size * 2,
          top: L.num.y - L.num.size * 0.6,
          width: L.num.size * 4,
          textAlign: "center",
          fontFamily: theme.font.display,
          fontWeight: 800,
          fontSize: L.num.size,
          lineHeight: 1.15,
          letterSpacing: "-0.07em",
          backgroundImage: theme.color.gradient,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          transform: `scale(${mix(Math.min(1.15, slam), 2.6, 1) * mix(outP, 1, 4)}) rotate(${interpolate(Math.min(1, slam), [0, 1], [-12, 0])}deg)`,
          filter: `blur(${mix(Math.min(1, slam), 22, 0)}px) drop-shadow(0 0 60px rgba(34,193,238,0.45))`,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
        {m.suffix}
      </div>
      <div style={{ position: "absolute", left: L.text.x, top: L.text.y, width: L.text.w, textAlign: L.text.align }}>
        {line(m.label, METRIC.label, L.text.size, 800, "#F4FBF8")}
        <div style={{ height: L.text.sub * 0.3 }} />
        {line(m.sub, METRIC.sub, L.text.sub, 600, "rgba(232,242,242,0.75)")}
      </div>
      {L.card && cardP > 0 && (
        <div
          style={{
            position: "absolute",
            left: L.card.x,
            top: L.card.y,
            width: Q.w * L.card.k,
            height: Q.h * L.card.k,
            borderRadius: 24 * L.card.k,
            boxShadow: CARD_SHADOW,
            opacity: Math.min(1, cardP * 2),
            transform: `perspective(2200px) translateY(${mix(Math.min(1, cardP), 220, 0)}px) rotateX(${mix(Math.min(1, cardP), -25, 0)}deg)`,
          }}
        >
          <Shot src="dashboard/quality.png" w={Q.w * L.card.k} h={Q.h * L.card.k} />
        </div>
      )}
    </AbsoluteFill>
  )
}
