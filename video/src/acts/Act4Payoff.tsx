import React from "react"
import { AbsoluteFill, Img, random, staticFile } from "remotion"

import { COPY } from "../config/copy"
import { useLayout } from "../config/layout"
import { glow, scoreColor, theme } from "../config/theme"
import { at, CUES, STAGGER } from "../config/timing"
import { APPLICANTS, TOP3 } from "../data/mock"
import { gridCell } from "../lib/grid"
import { breathe, enter, EXIT, mix, progress, springAt, useClock, within } from "../lib/time"
import { ApplicationCard } from "../ui/ApplicationCard"
import { StageText } from "../ui/StageText"
import parts from "../../public/logo/parts.json"

/**
 * AKT 4 — PAYOFF. Harter Schnitt auf die Totale: 80 Karten, 77 gehen,
 * drei rücken in die Mitte. Danach baut sich das Logo aus seinen Teilen auf.
 */
export const Act4Payoff: React.FC = () => {
  const { t } = useClock()
  if (!within(t, at("payoff"), at("ende") + 1)) return null
  return (
    <AbsoluteFill>
      {t < at("logo", CUES.logo.abgang) + EXIT && <Shortlist />}
      <LogoBuild />
    </AbsoluteFill>
  )
}

const Shortlist: React.FC = () => {
  const L = useLayout()
  const { t, fps } = useClock()
  const P0 = at("payoff")
  const C = CUES.payoff
  const exitAt = at("logo", CUES.logo.abgang) + EXIT
  const out = progress(t, exitAt - EXIT, exitAt, theme.ease.in)
  const topIdx = TOP3.map((c) => c.applicant)
  const b = breathe(t, 0.7)

  const P = L.payoff
  const slotX = (k: number) => L.W / 2 + (k - 1) * (P.cardW + P.gap)

  return (
    <AbsoluteFill style={{ opacity: 1 - out, transform: `scale(${mix(out, 1, 1.04)})` }}>
      {APPLICANTS.map((a, i) => {
        const g = gridCell(L, i)
        const k = topIdx.indexOf(i)
        if (k < 0) {
          // 77 verblassen und schrumpfen gestaffelt weg
          const s0 = P0 + C.verblassen + random(`fade-${i}`) * 0.4
          const p = progress(t, s0, s0 + 0.33, theme.ease.in)
          if (p >= 1) return null
          return (
            <div
              key={a.id}
              style={{
                position: "absolute",
                left: g.x - L.card.w / 2,
                top: g.y - L.card.h / 2,
                transform: `scale(${g.scale * mix(p, 1, 0.5)})`,
                opacity: 1 - p,
              }}
            >
              <ApplicationCard applicant={a} w={L.card.w} h={L.card.h} scanned={1} shadow={false} />
            </div>
          )
        }
        // drei rücken in die Mitte
        const m = springAt(t, P0 + C.dreiRuecken + k * STAGGER, fps, theme.spring.smooth)
        const x = mix(m, g.x, slotX(k))
        const y = mix(m, g.y, P.y) + b.y * m
        const scale = mix(m, g.scale, P.cardW / L.card.w) * mix(m, 1, b.scale)
        const c = TOP3[k]
        const badge = enter(t, fps, P0 + C.dreiRuecken + 0.45 + k * STAGGER, undefined, { rise: 10, scaleFrom: 0.6 })
        const hero = k === 0 ? progress(t, P0 + C.dreiRuecken + 0.6, P0 + C.dreiRuecken + 1.1) : 0
        return (
          <div
            key={a.id}
            style={{
              position: "absolute",
              left: x - L.card.w / 2,
              top: y - L.card.h / 2,
              transform: `scale(${scale})`,
              zIndex: 10 + k,
            }}
          >
            <div style={{ borderRadius: L.card.w * 0.07, boxShadow: hero > 0.01 ? glow(theme.color.cyan, hero * 0.8) : undefined }}>
              <ApplicationCard applicant={a} w={L.card.w} h={L.card.h} scanned={1} />
            </div>
            {/* Rang und Score */}
            <div
              style={{
                position: "absolute",
                right: L.card.w * 0.07,
                top: L.card.h * 0.43,
                opacity: badge.opacity,
                transform: `translateY(${badge.y}px) scale(${badge.scale})`,
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontFamily: theme.font.display,
              }}
            >
              <span style={{ fontSize: 22, fontWeight: 700, color: theme.color.mutedFg }}>Platz {k + 1}</span>
              <span style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.03em", color: scoreColor(c.score) }}>{c.score}%</span>
            </div>
          </div>
        )
      })}

      <div style={{ position: "absolute", top: P.textY, left: 0, width: L.W, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <StageText text={COPY.payoff[0]} start={P0 + C.text1} size={P.textSize} align="center" maxW={L.W - 2 * L.margin} />
        <StageText text={COPY.payoff[1]} start={P0 + C.text2} size={P.textSize} align="center" color={theme.color.textDim} />
      </div>
    </AbsoluteFill>
  )
}

/** Logo aus Badge, R-Bauteilen und Buchstaben; danach Tagline und CTA. */
const LogoBuild: React.FC = () => {
  const L = useLayout()
  const { t, fps } = useClock()
  const A = at("logo")
  const C = CUES.logo
  if (t < A + C.badge - 0.05) return null

  const scale = L.logo.w / parts.width
  const H = parts.height * scale
  const b = breathe(t, 0.8, 0.7)

  const badgeP = springAt(t, A + C.badge, fps, theme.spring.logo)
  const halo = progress(t, A + C.badge + 0.1, A + C.badge + 0.8)
  const piece = (file: string, cx: number, cy: number, p: number, from: { x: number; y: number; r: number; s: number }) => (
    <Img
      key={file}
      src={staticFile(`logo/${file}`)}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: parts.width * scale,
        height: H,
        opacity: Math.min(1, p * 2),
        transformOrigin: `${cx * scale}px ${cy * scale}px`,
        transform: `translate(${mix(p, from.x, 0)}px, ${mix(p, from.y, 0)}px) rotate(${mix(p, from.r, 0)}deg) scale(${mix(p, from.s, 1)})`,
      }}
    />
  )

  const tag = enter(t, fps, A + C.tagline, undefined, { rise: 24 })
  const cta = enter(t, fps, A + C.cta, undefined, { rise: 18 })
  const top = L.logo.y - H / 2

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: (L.W - L.logo.w) / 2,
          top,
          width: L.logo.w,
          height: H,
          transform: `scale(${b.scale}) translateY(${b.y}px)`,
        }}
      >
        {/* Hero: weicher Cyan-Schein hinter dem Badge */}
        <div
          style={{
            position: "absolute",
            left: parts.badge.cx * scale - H,
            top: parts.badge.cy * scale - H,
            width: H * 2,
            height: H * 2,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(34,193,238,0.38) 0%, rgba(34,193,238,0.12) 40%, rgba(34,193,238,0) 70%)",
            opacity: halo,
          }}
        />
        {piece(parts.badge.file, parts.badge.cx, parts.badge.cy, badgeP, { x: 0, y: 30, r: -24, s: 0.3 })}
        {parts.r.map((r, k) =>
          piece(r.file, r.cx, r.cy, springAt(t, A + C.r + k * STAGGER, fps, theme.spring.logo), {
            x: k === 0 ? -70 : 50,
            y: k === 0 ? -80 : 90,
            r: k === 0 ? -30 : 24,
            s: 0.7,
          }),
        )}
        {parts.letters.map((l, k) => {
          const p = springAt(t, A + C.wortmarke + k * STAGGER, fps, theme.spring.snappy)
          return (
            <div key={l.file} style={{ position: "absolute", inset: 0, filter: p < 0.98 ? `blur(${mix(Math.min(1, p), 6, 0)}px)` : undefined }}>
              {piece(l.file, l.cx, l.cy, p, { x: 0, y: 60, r: 0, s: 0.92 })}
            </div>
          )
        })}
      </div>

      <div style={{ position: "absolute", top: top + H + L.logo.tagline * 0.9, left: 0, width: L.W, textAlign: "center" }}>
        <div
          style={{
            display: "inline-block",
            fontFamily: theme.font.display,
            fontSize: L.logo.tagline,
            fontWeight: 750,
            letterSpacing: "-0.03em",
            color: theme.color.text,
            opacity: tag.opacity,
            transform: `translateY(${tag.y}px) scale(${tag.scale})`,
            filter: tag.blur > 0.1 ? `blur(${tag.blur}px)` : undefined,
          }}
        >
          {COPY.tagline}
        </div>
        <div
          style={{
            marginTop: L.logo.cta * 1.1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: L.logo.cta * 0.6,
            fontFamily: theme.font.support,
            fontSize: L.logo.cta,
            fontWeight: 500,
            color: theme.color.textDim,
            opacity: cta.opacity,
            transform: `translateY(${cta.y}px)`,
          }}
        >
          <span>{COPY.cta.aktion}</span>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: theme.color.green }} />
          <span style={{ fontWeight: 700, color: theme.color.text }}>{COPY.cta.url}</span>
        </div>
      </div>
    </AbsoluteFill>
  )
}
