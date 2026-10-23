import React from "react"
import { AbsoluteFill, Img, staticFile } from "remotion"

import { Cursor } from "../../components/motion/Cursor"
import { theme } from "../../config/theme"
import { mix, progress, springAt, useClock } from "../../lib/time"
import { Caption, CARD_SHADOW, meta, pick, Ripple, useFmt } from "../kit"
import { COPY, SCENE, SCORE } from "../timing"

const M = meta.score

/**
 * Feature 2: die Match-Analyse-Karte der Website. Die Zählung 0 → 87 und die
 * Balken sind die echte Animation der Seite (Bildfolge aus capture-anim.mjs);
 * sie läuft ab dem Klick auf die Kandidatenzeile. Im Hochformat stehen die
 * beiden Spalten der Karte untereinander.
 */
export const Score: React.FC = () => {
  const { t, fps } = useClock()
  const { fmt, W } = useFmt()
  const { from, to } = SCENE.score

  const frame = t < SCORE.click ? 0 : Math.min(M.frames - 1, Math.floor((t - SCORE.click) * fps))
  const src = staticFile(`showreel/score/${String(frame).padStart(4, "0")}.webp`)
  const rightW = M.w - M.split

  const L = pick(fmt, {
    v: { k: 1.6, left: { x: (W - M.split * 1.6) / 2, y: 470 }, right: { x: (W - rightW * 1.6) / 2, y: 1150 }, cap: { top: 230, size: 112, width: 960 }, joined: false },
    s: { k: 1.5, left: { x: (W - M.split * 1.5) / 2, y: 330 }, right: null, cap: { top: 110, size: 92, width: 980 }, joined: false },
    h: { k: 1.5, left: { x: (W - M.w * 1.5) / 2, y: 360 }, right: { x: (W - M.w * 1.5) / 2 + M.split * 1.5, y: 360 }, cap: { top: 130, size: 100, width: 1700 }, joined: true },
  })
  const k = L.k

  const enterP = springAt(t, from, fps, theme.spring.smooth)
  const q = Math.min(1, enterP)
  const rightP = springAt(t, SCORE.right, fps, theme.spring.snappy)
  const outP = progress(t, to - 0.3, to, theme.ease.in)

  const piece = (x0: number, w: number, pos: { x: number; y: number }, radius: string, p: number, dir: number) => (
    <div
      style={{
        position: "absolute",
        left: pos.x,
        top: pos.y,
        width: w * k,
        height: M.h * k,
        borderRadius: radius,
        overflow: "hidden",
        boxShadow: CARD_SHADOW,
        opacity: Math.min(1, p * 2),
        transform: `perspective(2200px) translate(${mix(Math.min(1, p), 220 * dir, 0)}px, ${mix(Math.min(1, p), 120, 0)}px) rotateY(${mix(Math.min(1, p), -26 * dir, 0)}deg) scale(${mix(Math.min(1, p), 0.85, 1)})`,
      }}
    >
      <Img src={src} style={{ position: "absolute", left: -x0 * k, top: 0, width: M.w * k, height: M.h * k, maxWidth: "none" }} />
    </div>
  )

  const r = 30 * k
  // Kandidatenzeile (Klickziel) und Score-Zahl, in CSS-Pixeln der Karte
  const row = { x: L.left.x + 250 * k, y: L.left.y + 325 * k }
  const num = { x: L.left.x + 70 * k, y: L.left.y + 58 * k }
  const arrive = progress(t, from + 0.15, SCORE.click - 0.04, theme.ease.out)
  const leave = progress(t, SCORE.click + 0.25, SCORE.click + 0.8, theme.ease.inOut)
  const cx = mix(arrive, W * 0.9, row.x) + leave * 140
  const cy = mix(arrive, row.y + 520, row.y) + leave * 160
  const press = t >= SCORE.click - 0.05 && t < SCORE.click + 0.1 ? 1 : 0
  const pulse = progress(t, SCORE.pulse, SCORE.pulse + 0.5, theme.ease.out)

  return (
    <AbsoluteFill style={{ opacity: 1 - outP, transform: `scale(${mix(outP, 1, 1.15)})` }}>
      <div style={{ position: "absolute", top: L.cap.top, left: (W - L.cap.width) / 2, width: L.cap.width }}>
        <Caption text={COPY.captions.score} at={from + 0.05} out={to} size={L.cap.size} />
      </div>
      {piece(0, M.split, L.left, L.joined ? `${r}px 0 0 ${r}px` : `${r}px`, enterP, 1)}
      {L.right && piece(M.split, rightW, L.right, L.joined ? `0 ${r}px ${r}px 0` : `${r}px`, rightP, -1)}
      <Ripple x={row.x} y={row.y} at={SCORE.click} size={120} />
      {pulse > 0 && pulse < 1 && (
        <div
          style={{
            position: "absolute",
            left: num.x - 140 * k * (0.6 + pulse),
            top: num.y - 140 * k * (0.6 + pulse),
            width: 280 * k * (0.6 + pulse),
            height: 280 * k * (0.6 + pulse),
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(34,193,238,0.45) 0%, rgba(22,199,124,0) 65%)",
            opacity: 1 - pulse,
            mixBlendMode: "screen",
          }}
        />
      )}
      {q > 0.3 && <Cursor x={cx - 4} y={cy - 2} press={press} size={pick(fmt, { v: 58, s: 50, h: 50 })} />}
    </AbsoluteFill>
  )
}
