import React from "react"
import { AbsoluteFill, Img, staticFile } from "remotion"

import { COPY } from "../config/copy"
import { useLayout } from "../config/layout"
import { theme } from "../config/theme"
import { at, CUES } from "../config/timeline"
import { enterExit, mix, progress, useTime } from "../lib/time"

/** Szene 7: Logo, Tagline, CTA. Ruhig, viel Weiß, steht am Ende still. */
export const Outro: React.FC = () => {
  const L = useLayout()
  const t = useTime()
  const A = at("abschluss")
  if (t < A) return null

  const END = Number.POSITIVE_INFINITY
  const logoP = progress(t, A + CUES.abschluss.logo, A + CUES.abschluss.logo + 1.0)
  const tag = enterExit(t, A + CUES.abschluss.tagline, END, { dur: 0.7, rise: 18 })
  const cta = enterExit(t, A + CUES.abschluss.cta, END, { dur: 0.7, rise: 14 })
  // Logo-Seitenverhältnis von public/logo.png (2500 × 621)
  const logoH = L.outro.logoW * (621 / 2500)

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Img
          src={staticFile("logo.png")}
          style={{
            width: L.outro.logoW,
            height: logoH,
            opacity: logoP,
            transform: `translateY(${mix(logoP, 22, 0)}px) scale(${mix(logoP, 0.965, 1)})`,
            filter: logoP < 0.99 ? `blur(${mix(logoP, 8, 0)}px)` : undefined,
          }}
        />
        <div
          style={{
            marginTop: L.outro.tagline * 1.15,
            fontFamily: theme.font.display,
            fontSize: L.outro.tagline,
            fontWeight: 750,
            letterSpacing: "-0.03em",
            color: theme.color.ink,
            opacity: tag.opacity,
            transform: `translateY(${tag.y}px)`,
            filter: tag.blur > 0.05 ? `blur(${tag.blur}px)` : undefined,
          }}
        >
          {COPY.tagline}
        </div>
        <div
          style={{
            marginTop: L.outro.cta * 1.1,
            fontFamily: theme.font.support,
            fontSize: L.outro.cta,
            fontWeight: 500,
            color: theme.color.teal,
            opacity: cta.opacity,
            transform: `translateY(${cta.y}px)`,
            display: "flex",
            alignItems: "center",
            gap: L.outro.cta * 0.6,
          }}
        >
          <span>{COPY.cta.aktion}</span>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: theme.color.green }} />
          <span style={{ fontWeight: 700, color: theme.color.ink }}>{COPY.cta.url}</span>
        </div>
      </div>
    </AbsoluteFill>
  )
}
