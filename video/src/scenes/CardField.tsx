import React from "react"
import { AbsoluteFill, random } from "remotion"

import { useLayout } from "../config/layout"
import { theme } from "../config/theme"
import { at, CUES } from "../config/timeline"
import { APPLICANTS, RANKED } from "../data/mock"
import { gridPose, listGeometry, stackPose, unsortedSlots } from "../lib/geometry"
import { capturedAt } from "../lib/sweep"
import { mix, progress, useTime } from "../lib/time"
import { ApplicationCard } from "../ui/ApplicationCard"

/**
 * Die 80 Bewerbungskarten über die Szenen 1–5:
 *   1  fallen nacheinander auf den Stapel
 *   2  liegen ruhig
 *   3  verschwimmen
 *   4  fächern sich zum Raster auf, werden vom Verlauf erfasst und scharf
 *   5  die Karten der Rangliste wandern in ihre Zeile, alle anderen gehen
 */
export const CardField: React.FC = () => {
  const L = useLayout()
  const t = useTime()

  const R = at("rangfolge")
  if (t > R + 1.6) return null

  const n = APPLICANTS.length
  const dropFrom = at("stapel", 0.1)
  const dropSpan = CUES.stapel.letzteKarte - 0.1 - 0.5

  const blurIn = progress(
    t,
    at("unschaerfe", CUES.unschaerfe.blur),
    at("unschaerfe", CUES.unschaerfe.blur + 1.3),
    theme.ease.inOut,
  )

  const rankOfApplicant = new Map(RANKED.slice(0, L.list.rows).map((r, rank) => [r.applicant, rank]))
  const slotOf = unsortedSlots(L)
  const list = listGeometry(L)

  return (
    <AbsoluteFill>
      {APPLICANTS.map((a, i) => {
        // 1 — Fallen: anfangs mit Abstand, dann immer dichter
        const ti = dropFrom + dropSpan * Math.pow(i / (n - 1), 0.72)
        const pd = progress(t, ti, ti + 0.5, theme.ease.out)
        if (pd <= 0) return null

        const s = stackPose(L, i)
        // ruhiges Atmen des Stapels in Szene 2–3
        const breathe = Math.sin(t * 1.4) * 1.5

        // 4 — Auffächern zum Raster (oberste Karten zuerst)
        const g = gridPose(L, i)
        const fanStart = at("erfassen", CUES.erfassen.auffaechern) + (n - 1 - i) * 0.004
        const pf = progress(t, fanStart, fanStart + 0.8, theme.ease.inOut)

        let x = mix(pf, s.x, g.x)
        let y = mix(pf, s.y + breathe, g.y) + mix(pd, -150, 0)
        const rot = mix(pf, s.rot + mix(pd, 6, 0), 0)
        let scale = mix(pf, mix(pd, 1.05, 1) * mix(blurIn, 1, 0.97), g.scale)
        let opacity = progress(t, ti, ti + 0.22, theme.ease.out)

        // 3/4 — Unschärfe, bis der Verlauf die Karte erfasst
        const cap = capturedAt(L, t, x)
        const blurAmt = blurIn * (1 - cap)
        // Verkleinerte Karten brauchen weniger Unschärfe für denselben Eindruck.
        const blurPx = blurAmt * mix(pf, 11, 4)

        // 5 — Übergang in die Rangliste
        const rank = rankOfApplicant.get(i)
        if (rank !== undefined) {
          const start = R + CUES.rangfolge.zeilen + rank * 0.05
          const pm = progress(t, start, start + 0.65, theme.ease.inOut)
          x = mix(pm, x, L.stage.x + list.w / 2)
          y = mix(pm, y, list.rowY(slotOf[rank]) + list.rowH / 2)
          scale = mix(pm, scale, (list.rowH * 0.9) / L.card.h)
          opacity *= 1 - progress(t, start + 0.3, start + 0.6, theme.ease.out)
        } else {
          const start = R + random(`exit-${i}`) * 0.25
          const pe = progress(t, start, start + 0.3, theme.ease.in)
          opacity *= 1 - pe
          scale *= mix(pe, 1, 0.86)
          y += mix(pe, 0, 18)
        }

        if (opacity <= 0.001) return null

        return (
          <div
            key={a.id}
            style={{
              position: "absolute",
              left: x - L.card.w / 2,
              top: y - L.card.h / 2,
              transform: `rotate(${rot}deg) scale(${scale})`,
              opacity: opacity * mix(blurAmt, 1, 0.55),
              filter: blurPx > 0.05 ? `blur(${blurPx}px) grayscale(${blurAmt * 0.5})` : undefined,
              zIndex: rank !== undefined ? 200 + rank : i,
            }}
          >
            <ApplicationCard applicant={a} w={L.card.w} h={L.card.h} captured={cap * pf} />
          </div>
        )
      })}
    </AbsoluteFill>
  )
}
