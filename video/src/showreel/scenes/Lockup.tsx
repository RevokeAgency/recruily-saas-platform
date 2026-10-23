import React from "react"
import { AbsoluteFill } from "remotion"

import { RevetlyLogo } from "../../components/brand/RevetlyLogo"
import { Cursor } from "../../components/motion/Cursor"
import { theme } from "../../config/theme"
import { mix, progress, springAt, useClock } from "../../lib/time"
import { meta, pick, Ripple, Shot, useFmt } from "../kit"
import { COPY, LOCKUP } from "../timing"

/** Beat 7: Logo baut sich auf, der echte Button der Website kommt, der Cursor klickt. */
export const Lockup: React.FC = () => {
  const { t, fps } = useClock()
  const { fmt, W, H } = useFmt()

  const L = pick(fmt, {
    v: { logo: 800, logoY: 640, k: 2.6, ctaY: 1060, subY: 1290, sub: 46, url: 40 },
    s: { logo: 720, logoY: 250, k: 2.25, ctaY: 590, subY: 790, sub: 40, url: 34 },
    h: { logo: 860, logoY: 230, k: 2.3, ctaY: 610, subY: 800, sub: 40, url: 34 },
  })
  const cw = meta.cta.w * L.k
  const ch = meta.cta.h * L.k
  const cxBtn = W / 2
  const cyBtn = L.ctaY + ch / 2

  const ctaP = springAt(t, LOCKUP.cta, fps, { damping: 12, stiffness: 180, mass: 0.7 })
  const pressDepth = t >= LOCKUP.click - 0.05 ? Math.exp(-Math.max(0, t - LOCKUP.click) * 9) : 0
  const glowP = progress(t, LOCKUP.click, LOCKUP.click + 0.6, theme.ease.out)

  const arrive = progress(t, LOCKUP.cta + 0.2, LOCKUP.click - 0.04, theme.ease.out)
  const target = { x: cxBtn + cw * 0.3, y: cyBtn + ch * 0.1 }
  const cx = mix(arrive, W * 0.95, target.x)
  const cy = mix(arrive, H * 0.95, target.y)

  const fade = (at: number) => {
    const p = springAt(t, at, fps, theme.spring.snappy)
    return { opacity: Math.min(1, p * 1.4), transform: `translateY(${mix(Math.min(1, p), 30, 0)}px)` }
  }

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: (W - L.logo) / 2, top: L.logoY }}>
        <RevetlyLogo start={LOCKUP.logo} width={L.logo} />
      </div>
      <div
        style={{
          position: "absolute",
          left: cxBtn - cw / 2,
          top: L.ctaY,
          width: cw,
          height: ch,
          opacity: Math.min(1, ctaP * 2),
          transform: `scale(${mix(Math.min(1.1, ctaP), 0.4, 1) * (1 - pressDepth * 0.06)})`,
          borderRadius: ch / 2,
          boxShadow: `0 30px 70px -20px rgba(22,199,124,0.55), 0 0 ${mix(glowP, 90, 30)}px rgba(34,193,238,${mix(glowP, 0.9, 0.35) * (t >= LOCKUP.click ? 1 : 0.4)})`,
        }}
      >
        <Shot src="cta.png" w={cw} h={ch} />
      </div>
      <Ripple x={target.x} y={target.y} at={LOCKUP.click} size={160} />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: L.subY,
          width: W,
          textAlign: "center",
          fontFamily: theme.font.display,
          fontWeight: 600,
          fontSize: L.sub,
          color: "rgba(232,242,242,0.8)",
          letterSpacing: "-0.01em",
          ...fade(LOCKUP.sub),
        }}
      >
        {COPY.ctaSub}
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: L.subY + L.sub * 1.7,
          width: W,
          textAlign: "center",
          fontFamily: theme.font.display,
          fontWeight: 800,
          fontSize: L.url,
          letterSpacing: "0.02em",
          backgroundImage: theme.color.gradient,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          ...fade(LOCKUP.url),
        }}
      >
        {COPY.url}
      </div>
      {t >= LOCKUP.cta + 0.15 && <Cursor x={cx - 4} y={cy - 2} press={t >= LOCKUP.click - 0.05 && t < LOCKUP.click + 0.12 ? 1 : 0} size={pick(fmt, { v: 58, s: 50, h: 50 })} />}
    </AbsoluteFill>
  )
}
