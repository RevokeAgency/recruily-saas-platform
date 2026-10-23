import React from "react"
import { AbsoluteFill, Img, interpolate, staticFile } from "remotion"

import { Cursor } from "../../components/motion/Cursor"
import { theme } from "../../config/theme"
import { mix, progress, springAt, useClock } from "../../lib/time"
import { Caption, CARD_SHADOW, meta, pick, Ripple, useFmt } from "../kit"
import { COPY, INTERVIEW, SCENE } from "../timing"

const M = meta.interview

/**
 * Feature 3: der Gesprächsleitfaden der Website. Bewertungen und die Zählung
 * 72 → 78 sind die echte Animation der Seite; die Bildfolge ist zeitlich so
 * gelegt, dass jeder Klick auf einem Achtel sitzt. Der Cursor klickt genau
 * dort, wo die Seite die Bewertung setzt.
 */
export const Interview: React.FC = () => {
  const { t, fps } = useClock()
  const { fmt, W } = useFmt()
  const { from, to } = SCENE.interview

  const frame = Math.round(
    interpolate(
      t,
      INTERVIEW.map.map(([s]) => s),
      INTERVIEW.map.map(([, f]) => f),
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    ),
  )
  const src = staticFile(`showreel/interview/${String(Math.min(M.frames - 1, frame)).padStart(4, "0")}.webp`)

  const L = pick(fmt, {
    v: { k: 1.78, x: (W - M.w * 1.78) / 2, y: 560, cap: { top: 250, left: (W - 960) / 2, size: 112, width: 960, align: "center" as const } },
    s: { k: 1.32, x: (W - M.w * 1.32) / 2, y: 225, cap: { top: 70, left: (W - 1000) / 2, size: 80, width: 1000, align: "center" as const } },
    h: { k: 1.55, x: 1920 - M.w * 1.55 - 170, y: 72, cap: { top: 380, left: 170, size: 116, width: 700, align: "left" as const } },
  })
  const k = L.k

  const enterP = springAt(t, from, fps, theme.spring.smooth)
  const q = Math.min(1, enterP)
  const outP = progress(t, to - 0.3, to, theme.ease.in)

  const pt = (c: { x: number; y: number }) => ({ x: L.x + c.x * k, y: L.y + c.y * k })
  const targets = M.clicks.map(pt)

  // Cursor springt von Bewertung zu Bewertung; jeder Klick auf seinem Achtel
  const start = { x: W * 0.92, y: targets[0].y + 600 }
  let cx = start.x
  let cy = start.y
  const legs = [start, ...targets]
  INTERVIEW.clicks.forEach((at, i) => {
    const p = progress(t, at - (i === 0 ? 0.4 : 0.2), at - 0.03, theme.ease.inOut)
    if (p > 0) {
      cx = mix(p, legs[i].x, legs[i + 1].x)
      cy = mix(p, legs[i].y, legs[i + 1].y)
    }
  })
  const leave = progress(t, INTERVIEW.clicks[2] + 0.2, INTERVIEW.clicks[2] + 0.7, theme.ease.inOut)
  cx += leave * 180
  cy += leave * 120
  const press = INTERVIEW.clicks.some((at) => t >= at - 0.05 && t < at + 0.08) ? 1 : 0
  const match = pt(M.match)

  return (
    <AbsoluteFill style={{ opacity: 1 - outP, transform: `scale(${mix(outP, 1, 1.15)})` }}>
      <div style={{ position: "absolute", top: L.cap.top, left: L.cap.left, width: L.cap.width }}>
        <Caption text={COPY.captions.interview} at={from + 0.05} out={to} size={L.cap.size} align={L.cap.align} />
      </div>
      <div
        style={{
          position: "absolute",
          left: L.x,
          top: L.y,
          width: M.w * k,
          height: M.h * k,
          borderRadius: 30 * k,
          overflow: "hidden",
          boxShadow: CARD_SHADOW,
          opacity: Math.min(1, enterP * 2),
          transform: `perspective(2400px) translateY(${mix(q, 300, 0)}px) rotateX(${mix(q, -30, 0)}deg) scale(${mix(q, 0.82, 1)})`,
        }}
      >
        <Img src={src} style={{ width: "100%", height: "100%" }} />
      </div>
      {INTERVIEW.clicks.map((at, i) => (
        <Ripple key={i} x={targets[i].x} y={targets[i].y} at={at} size={90} />
      ))}
      <Ripple x={match.x} y={match.y} at={INTERVIEW.pulse} size={170} color="#16C77C" />
      {q > 0.3 && <Cursor x={cx - 4} y={cy - 2} press={press} size={pick(fmt, { v: 58, s: 48, h: 50 })} />}
    </AbsoluteFill>
  )
}
