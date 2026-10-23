import React from "react"
import { AbsoluteFill } from "remotion"

import { Cursor } from "../../components/motion/Cursor"
import { theme } from "../../config/theme"
import { mix, progress, springAt, useClock } from "../../lib/time"
import { Caption, CARD_SHADOW, pick, Ripple, Shot, useFmt } from "../../showreel/kit"
import meta from "../../../public/showreel/dashboard/dashboard.json"
import { COPY, feature, SCENE } from "../timing"

type Card = "top" | "prio" | "recent"

/**
 * Feature-Moment mit einer echten Karte des Dashboards: Die Karte kommt herein, ihre
 * Zeilen (Streifen derselben Aufnahme) fliegen auf Sechzehnteln an ihren Platz, dann
 * fährt der Cursor auf die Zielzeile. Dort erscheint der echte Hover-Zustand der Seite,
 * auf dem nächsten Schlag klickt er.
 */
export const Feature: React.FC<{ card: Card; dir?: 1 | -1 }> = ({ card, dir = 1 }) => {
  const { t, fps } = useClock()
  const { fmt, W, H } = useFmt()
  const { from, to } = SCENE[card]
  const f = feature(from)
  const M = meta.cards[card]

  const L = pick(fmt, {
    v: { k: 2.2, x: (W - M.w * 2.2) / 2, y: card === "prio" ? 640 : 560, cap: { top: 270, left: 60, width: W - 120, size: 112, align: "center" as const } },
    s: { k: card === "prio" ? 1.95 : 1.62, x: (W - M.w * (card === "prio" ? 1.95 : 1.62)) / 2, y: card === "prio" ? 330 : 312, cap: { top: 95, left: 50, width: W - 100, size: 88, align: "center" as const } },
    h: { k: 2.0, x: W - M.w * 2.0 - 150, y: (H - M.h * 2.0) / 2, cap: { top: 400, left: 170, width: 760, size: 112, align: "left" as const } },
  })
  const k = L.k

  const enterP = springAt(t, from, fps, theme.spring.smooth)
  const q = Math.min(1, enterP)
  const outP = progress(t, to - 0.3, to, theme.ease.in)

  // Zeilen: eine pro Sechzehntel, danach liegt die unveränderte Karte darunter
  const rowAt = (i: number) => f.rows + i * 0.125
  const settled = t >= rowAt(M.rows.length - 1) + 0.5
  const hoverP = progress(t, f.hover, f.hover + 0.15, theme.ease.out)

  // Cursor: von außen auf die Zielzeile, Klick, dann ein Stück weiter
  const target = { x: L.x + M.target.x * k, y: L.y + M.target.y * k }
  const arrive = progress(t, f.hover - 0.55, f.hover - 0.02, theme.ease.out)
  const after = progress(t, f.click + 0.2, f.click + 0.8, theme.ease.inOut)
  const startX = dir > 0 ? W + 80 : -80
  const cx = mix(arrive, startX, target.x) + after * 70 * dir
  const cy = mix(arrive, target.y + 420, target.y) + after * 110
  const press = t >= f.click - 0.05 && t < f.click + 0.1 ? 1 : 0
  const glow = progress(t, f.click, f.click + 0.7, theme.ease.out)
  const row = M.rows[0]
  const hoverRow = card === "recent" ? M.rows[M.rows.length - 1] : row

  return (
    <AbsoluteFill style={{ opacity: 1 - outP, transform: `scale(${mix(outP, 1, 1.15)})` }}>
      <div style={{ position: "absolute", top: L.cap.top, left: L.cap.left, width: L.cap.width }}>
        <Caption text={COPY.captions[card]} at={from + 0.05} out={to} size={L.cap.size} align={L.cap.align} />
      </div>
      <div
        style={{
          position: "absolute",
          left: L.x,
          top: L.y,
          width: M.w * k,
          height: M.h * k,
          opacity: Math.min(1, enterP * 2),
          transform: `perspective(2400px) translate(${mix(q, 260 * dir, 0)}px, ${mix(q, 140, 0)}px) rotateY(${mix(q, -30 * dir, 0)}deg) rotateX(${mix(q, 12, 0)}deg) scale(${mix(q, 0.82, 1)})`,
        }}
      >
        <div style={{ position: "absolute", inset: 0, borderRadius: 24 * k, boxShadow: CARD_SHADOW }} />
        <div style={{ position: "absolute", left: 0, top: 0, width: M.w, height: M.h, transform: `scale(${k})`, transformOrigin: "0 0" }}>
          {settled ? (
            <Shot src={`dashboard/${card}.png`} w={M.w} h={M.h} />
          ) : (
            <>
              <Shot src={`dashboard/${card}-empty.png`} w={M.w} h={M.h} />
              {M.rows.map((r, i) => {
                const p = springAt(t, rowAt(i), fps, { damping: 15, stiffness: 200, mass: 0.6 })
                if (p <= 0) return null
                const pq = Math.min(1, p)
                return (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      left: 0,
                      top: r.y,
                      width: M.w,
                      height: r.h,
                      overflow: "hidden",
                      opacity: Math.min(1, p * 2),
                      transform: `translateX(${mix(p, 120 * dir, 0)}px) scale(${mix(pq, 0.94, 1)})`,
                      filter: `blur(${mix(pq, 6, 0)}px)`,
                    }}
                  >
                    <Shot src={`dashboard/${card}-row${i}.png`} w={M.w} h={r.h} />
                  </div>
                )
              })}
            </>
          )}
          {hoverP > 0 && <Shot src={`dashboard/${card}-hover.png`} w={M.w} h={M.h} style={{ opacity: hoverP }} />}
          {glow > 0 && glow < 1 && (
            <div
              style={{
                position: "absolute",
                left: 12,
                top: hoverRow.y,
                width: M.w - 24,
                height: hoverRow.h,
                borderRadius: 16,
                boxShadow: `0 0 0 ${mix(glow, 2, 10)}px rgba(34,193,238,${(1 - glow) * 0.8}), 0 0 ${40 * (1 - glow)}px rgba(22,199,124,${1 - glow})`,
              }}
            />
          )}
        </div>
      </div>
      <Ripple x={target.x} y={target.y} at={f.click} size={110} />
      {t >= f.hover - 0.6 && <Cursor x={cx - 4} y={cy - 2} press={press} size={pick(fmt, { v: 60, s: 52, h: 52 })} />}
    </AbsoluteFill>
  )
}
