import React from "react"
import { AbsoluteFill } from "remotion"

import { RevetlyLogo } from "../../components/brand/RevetlyLogo"
import { Cursor } from "../../components/motion/Cursor"
import { theme } from "../../config/theme"
import { mix, progress, springAt, useClock } from "../../lib/time"
import { pick, Ripple, Shot, useFmt } from "../../showreel/kit"
import meta from "../../../public/showreel/dashboard/dashboard.json"
import { COPY, LOCKUP } from "../timing"

/** Beat 7: Logo baut sich auf, der echte Button „Neuen Job erstellen" kommt, Hover, Klick. */
export const Lockup: React.FC = () => {
  const { t, fps } = useClock()
  const { fmt, W, H } = useFmt()

  const L = pick(fmt, {
    v: { logo: 820, logoY: 640, k: 3.0, ctaY: 1040, urlY: 1290, url: 48 },
    s: { logo: 720, logoY: 280, k: 2.2, ctaY: 610, urlY: 820, url: 40 },
    h: { logo: 860, logoY: 250, k: 2.3, ctaY: 620, urlY: 830, url: 40 },
  })
  const cw = meta.cta.w * L.k
  const ch = meta.cta.h * L.k

  const ctaP = springAt(t, LOCKUP.cta, fps, { damping: 12, stiffness: 180, mass: 0.7 })
  const hoverP = progress(t, LOCKUP.hover, LOCKUP.hover + 0.15, theme.ease.out)
  const press = t >= LOCKUP.click - 0.05 ? Math.exp(-Math.max(0, t - LOCKUP.click) * 9) : 0
  const glowP = progress(t, LOCKUP.click, LOCKUP.click + 0.6, theme.ease.out)

  const target = { x: W / 2 + cw * 0.2, y: L.ctaY + ch * 0.55 }
  const arrive = progress(t, LOCKUP.cta + 0.3, LOCKUP.hover - 0.02, theme.ease.out)
  const cx = mix(arrive, W * 0.95, target.x)
  const cy = mix(arrive, H * 0.95, target.y)
  const urlP = springAt(t, LOCKUP.url, fps, theme.spring.snappy)

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: (W - L.logo) / 2, top: L.logoY }}>
        <RevetlyLogo start={LOCKUP.logo} width={L.logo} />
      </div>
      <div
        style={{
          position: "absolute",
          left: (W - cw) / 2,
          top: L.ctaY,
          width: cw,
          height: ch,
          opacity: Math.min(1, ctaP * 2),
          transform: `scale(${mix(Math.min(1.1, ctaP), 0.4, 1) * (1 - press * 0.06)})`,
          borderRadius: ch / 2,
          boxShadow: `0 30px 70px -20px rgba(22,199,124,0.55), 0 0 ${mix(glowP, 90, 30)}px rgba(34,193,238,${mix(glowP, 0.9, 0.35) * (t >= LOCKUP.click ? 1 : 0.4)})`,
        }}
      >
        <Shot src="dashboard/cta-idle.png" w={cw} h={ch} />
        {hoverP > 0 && <Shot src="dashboard/cta-hover.png" w={cw} h={ch} style={{ opacity: hoverP }} />}
      </div>
      <Ripple x={target.x} y={target.y} at={LOCKUP.click} size={160} />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: L.urlY,
          width: W,
          textAlign: "center",
          fontFamily: theme.font.display,
          fontWeight: 800,
          fontSize: L.url,
          letterSpacing: "0.01em",
          backgroundImage: theme.color.gradient,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          opacity: Math.min(1, urlP * 1.4),
          transform: `translateY(${mix(Math.min(1, urlP), 30, 0)}px)`,
        }}
      >
        {COPY.url}
      </div>
      {t >= LOCKUP.cta + 0.25 && <Cursor x={cx - 4} y={cy - 2} press={t >= LOCKUP.click - 0.05 && t < LOCKUP.click + 0.12 ? 1 : 0} size={pick(fmt, { v: 60, s: 52, h: 52 })} />}
    </AbsoluteFill>
  )
}
