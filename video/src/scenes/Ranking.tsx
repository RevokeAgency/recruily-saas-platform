import React from "react"
import { AbsoluteFill } from "remotion"
import { ShieldCheck } from "lucide-react"

import { useLayout } from "../config/layout"
import { theme } from "../config/theme"
import { at, CUES } from "../config/timeline"
import { CRITERIA, EVIDENCE, JOB, RANKED } from "../data/mock"
import { listGeometry, remainingCount, unsortedSlots, visibleRanked } from "../lib/geometry"
import { mix, progress, useTime } from "../lib/time"
import { Avatar } from "../ui/Avatar"
import { CandidateRow } from "../ui/CandidateRow"
import { EvidenceItem } from "../ui/EvidenceItem"
import { ScoreRing } from "../ui/ScoreRing"

/**
 * Szenen 5 und 6: die Rangliste und der aufgeklappte erste Kandidat.
 *
 *   5  Zeilen erscheinen unsortiert, Scores zählen hoch, dann sortieren sie
 *      sich, die Rang-Badges kommen dazu.
 *   6  Alle anderen Zeilen gehen, Zeile 1 wächst zur Detailansicht mit
 *      Score-Ring und Begründungen samt Beleg.
 *   7  Alles geht für den Abschluss.
 */
export const Ranking: React.FC = () => {
  const L = useLayout()
  const t = useTime()
  const R = at("rangfolge")
  const B = at("begruendung")
  const A = at("abschluss")
  if (t < R || t > A + 0.6) return null

  const list = listGeometry(L)
  const ranked = visibleRanked(L)
  const slotOf = unsortedSlots(L)

  const sortP = progress(t, R + CUES.rangfolge.sortieren, R + CUES.rangfolge.sortieren + 0.9, theme.ease.inOut)

  // Szene 7: alles raus
  const outroP = progress(t, A, A + 0.4, theme.ease.in)

  // Kopf und Fußzeile der Liste
  const headIn = progress(t, R + 0.45, R + 1.0)
  const footIn = progress(t, R + 1.0, R + 1.6)
  const listOut = (k: number) => progress(t, B + k * 0.035, B + 0.3 + k * 0.035, theme.ease.in)

  // Szene 6: Zeile 1 wächst zur Detailansicht
  const openP = progress(t, B + CUES.begruendung.aufklappen + 0.15, B + CUES.begruendung.aufklappen + 0.85, theme.ease.inOut)
  const panelTop = L.panel.top
  const panelH = L.panel.h

  return (
    <AbsoluteFill style={{ opacity: 1 - outroP, transform: `translateY(${mix(outroP, 0, -16)}px)` }}>
      {/* Kopf: Stelle */}
      <div
        style={{
          position: "absolute",
          left: L.stage.x + 6,
          top: list.headerY,
          width: list.w,
          opacity: headIn * (1 - listOut(0)),
          transform: `translateY(${mix(headIn, 14, 0) + mix(listOut(0), 0, -12)}px)`,
          fontFamily: theme.font.display,
        }}
      >
        <div style={{ fontSize: list.rowH * 0.28, fontWeight: 750, color: theme.color.ink, letterSpacing: "-0.01em" }}>
          {JOB.title}
        </div>
        <div style={{ fontSize: list.rowH * 0.2, fontWeight: 500, color: theme.color.mutedFg, marginTop: 4 }}>
          {JOB.total} Bewerbungen · nach Match sortiert
        </div>
      </div>

      {/* Zeilen */}
      {ranked.map((c, rank) => {
        const appear = R + CUES.rangfolge.zeilen + rank * 0.05 + 0.35
        const pin = progress(t, appear, appear + 0.45)
        if (pin <= 0) return null
        const score = progress(t, appear, appear + 1.2) * c.score
        const lift = Math.sin(Math.PI * sortP) * (slotOf[rank] !== rank ? 1 : 0)
        const y = mix(sortP, list.rowY(slotOf[rank]), list.rowY(rank))
        const rankIn = progress(t, R + CUES.rangfolge.sortieren + 0.7 + rank * 0.06, R + CUES.rangfolge.sortieren + 1.1 + rank * 0.06)

        if (rank === 0) {
          return (
            <FirstRowToPanel
              key={c.name}
              rankIn={rankIn}
              score={score}
              y={y}
              pin={pin}
              openP={openP}
              panelTop={panelTop}
              panelH={panelH}
            />
          )
        }

        const out = listOut(rank)
        return (
          <div
            key={c.name}
            style={{
              position: "absolute",
              left: L.stage.x,
              top: y + mix(out, 0, 26),
              opacity: pin * (1 - out),
              transform: `translateY(${mix(pin, 14, 0)}px) scale(${mix(pin, 0.985, 1) + lift * 0.012})`,
              zIndex: 10 + (L.list.rows - rank),
              filter: lift > 0.01 ? `drop-shadow(0 ${lift * 14}px ${lift * 18}px rgba(12,26,22,.10))` : undefined,
            }}
          >
            <CandidateRow candidate={c} rank={rank + 1} rankOpacity={rankIn} score={score} w={list.w} h={list.rowH} />
          </div>
        )
      })}

      {/* Fußzeile */}
      <div
        style={{
          position: "absolute",
          left: L.stage.x,
          top: list.footerY + 14 + mix(listOut(L.list.rows), 0, 20),
          width: list.w,
          textAlign: "center",
          fontFamily: theme.font.display,
          fontSize: list.rowH * 0.21,
          fontWeight: 500,
          color: theme.color.mutedFg,
          opacity: footIn * (1 - listOut(L.list.rows)),
        }}
      >
        + {remainingCount(L)} weitere Bewerbungen, ebenfalls bewertet
      </div>
    </AbsoluteFill>
  )
}

/** Zeile 1, die in Szene 6 zur Detailansicht aufklappt. */
const FirstRowToPanel: React.FC<{
  rankIn: number
  score: number
  y: number
  pin: number
  openP: number
  panelTop: number
  panelH: number
}> = ({ rankIn, score, y, pin, openP, panelTop, panelH }) => {
  const L = useLayout()
  const t = useTime()
  const B = at("begruendung")
  const list = listGeometry(L)
  const c = RANKED[0]

  const top = mix(openP, y, panelTop)
  const h = mix(openP, list.rowH, panelH)
  const rowFade = 1 - progress(t, B + 0.05, B + 0.3, theme.ease.in)
  const panelIn = progress(t, B + 0.4, B + 0.85)

  const pad = L.format === "landscape" ? 34 : 30
  const fs = L.panel.fs
  const ringFill = progress(t, B + 0.7, B + 1.9)
  const evidence = EVIDENCE.slice(0, L.panel.evidence)

  return (
    <div
      style={{
        position: "absolute",
        left: L.stage.x,
        top,
        width: list.w,
        height: h,
        opacity: pin,
        transform: `translateY(${mix(pin, 14, 0)}px)`,
        zIndex: 50,
      }}
    >
      {/* Kartenfläche, die mitwächst */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: mix(openP, 18, 26),
          background: theme.color.card,
          border: `1px solid ${theme.color.border}`,
          boxShadow: openP > 0 ? theme.shadow.lifted : theme.shadow.card,
        }}
      />

      {/* Zeileninhalt, blendet beim Aufklappen aus */}
      {rowFade > 0 && (
        <div style={{ position: "absolute", left: 0, top: 0, opacity: rowFade }}>
          <CandidateRow candidate={c} rank={1} rankOpacity={rankIn} score={score} w={list.w} h={list.rowH} />
        </div>
      )}

      {/* Detailansicht */}
      {panelIn > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            padding: pad,
            boxSizing: "border-box",
            fontFamily: theme.font.display,
            overflow: "hidden",
          }}
        >
          {/* Kopf */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 22,
              opacity: panelIn,
              transform: `translateY(${mix(panelIn, 12, 0)}px)`,
            }}
          >
            <Avatar initials={c.initials} size={L.panel.ring * 0.56} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    backgroundImage: theme.color.gradient,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#0C1A16",
                  }}
                >
                  1
                </span>
                <span style={{ fontSize: fs * 1.75, fontWeight: 750, color: theme.color.ink, letterSpacing: "-0.015em" }}>
                  {c.name}
                </span>
              </div>
              <div style={{ fontSize: fs * 1.05, color: theme.color.mutedFg, marginTop: 6, fontWeight: 500 }}>
                {JOB.short} · {c.years} Jahre Erfahrung · {c.city}
              </div>
            </div>
            <ScoreRing size={L.panel.ring} target={c.score} fill={ringFill} value={c.score} id={`ring-${L.format}`} />
          </div>

          {/* Abschnittstitel wie im Modal */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: L.format === "landscape" ? 26 : 20,
              marginBottom: 14,
              paddingTop: L.format === "landscape" ? 20 : 16,
              borderTop: `1px solid ${theme.color.border}`,
              fontSize: fs * 1.0,
              fontWeight: 650,
              color: theme.color.cyanDeep,
              opacity: progress(t, B + 0.8, B + 1.2),
            }}
          >
            <ShieldCheck size={fs * 1.15} color={theme.color.cyanDeep} strokeWidth={2} />
            Begründungen &amp; Belege
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: fs * 0.85, color: theme.color.mutedFg, fontWeight: 500 }}>9 Kriterien, jedes begründet</span>
          </div>

          {/* Begründungen nacheinander */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {evidence.map((e, k) => {
              const crit = CRITERIA.find((cr) => cr.key === e.criterion)!
              const start = B + CUES.begruendung.belege + k * 0.38
              const pin = progress(t, start, start + 0.55)
              return (
                <div
                  key={e.criterion}
                  style={{
                    opacity: pin,
                    transform: `translateY(${mix(pin, 18, 0)}px) scale(${mix(pin, 0.99, 1)})`,
                  }}
                >
                  <EvidenceItem
                    criterion={crit}
                    evidence={e}
                    w={list.w - pad * 2}
                    fs={fs}
                    bar={progress(t, start + 0.15, start + 0.95)}
                    mark={progress(t, start + 0.55, start + 1.3, theme.ease.inOut)}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
