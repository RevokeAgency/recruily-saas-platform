import React from "react"
import { AbsoluteFill, random } from "remotion"
import { ShieldCheck } from "lucide-react"

import { COPY } from "../config/copy"
import { useLayout, type Layout } from "../config/layout"
import { scoreTextColor, theme } from "../config/theme"
import { at, CUES, STAGGER } from "../config/timing"
import { APPLICANTS, CRITERIA, EVIDENCE, JOB, ORDER_MID, ORDER_START, RANKED } from "../data/mock"
import { gridCell, listGeometry, zoomed } from "../lib/grid"
import { breathe, enter, mix, progress, springAt, useClock, within } from "../lib/time"
import { ApplicationCard } from "../ui/ApplicationCard"
import { Avatar } from "../ui/Avatar"
import { CandidateRow } from "../ui/CandidateRow"
import { EvidenceItem } from "../ui/EvidenceItem"
import { ScoreRing } from "../ui/ScoreRing"
import { StageText } from "../ui/StageText"
import { scanCamera } from "./Act3Scan"

/** Platz (Slot) jedes Rangs in einer Reihenfolge, nur für die sichtbaren Ränge. */
function slotsOf(order: readonly number[], rows: number): number[] {
  const slot: number[] = []
  order.filter((r) => r < rows).forEach((rank, s) => (slot[rank] = s))
  return slot
}

/** Kamera auf der Liste: schiebt langsam hinein, beim Detail ein Stück weiter. */
function listCamera(t: number, fps: number) {
  const push = progress(t, at("liste"), at("detail"), theme.ease.inOut)
  const zoom = springAt(t, at("detail"), fps, theme.spring.smooth)
  return mix(push, 0.95, 1.04) * mix(zoom, 1, 1.08)
}

/**
 * AKT 3b/c — Raster kollabiert zur Rangliste (Heromoment), Zeilen tauschen
 * per Spring die Plätze, Ränge zählen hoch. Dann Zoom auf Platz 1, die Zeile
 * klappt zur Begründungskarte auf.
 */
export const Act3Ranking: React.FC = () => {
  const { t } = useClock()
  if (!within(t, at("liste"), at("payoff"))) return null
  return (
    <AbsoluteFill>
      <Collapse />
      <List />
      <DetailPanel />
      <DetailText />
    </AbsoluteFill>
  )
}

/** Die Karten aus dem Scan-Raster fliegen in die Liste bzw. verschwinden. */
const Collapse: React.FC = () => {
  const L = useLayout()
  const { t } = useClock()
  const T0 = at("liste")
  if (t > T0 + 1.2) return null

  const cam = scanCamera(L, T0)
  const geo = listGeometry(L)
  const start = slotsOf(ORDER_START, L.list.rows)
  const rankOf = new Map(RANKED.slice(0, L.list.rows).map((r, rank) => [r.applicant, rank]))

  return (
    <AbsoluteFill>
      {APPLICANTS.map((a, i) => {
        const g = gridCell(L, i)
        const from = zoomed(L, g, cam.zoom, cam.dx, cam.dy)
        const fromScale = g.scale * cam.zoom
        const rank = rankOf.get(i)
        let x: number, y: number, scale: number, opacity: number
        if (rank !== undefined) {
          const s0 = T0 + 0.1 + start[rank] * STAGGER
          const p = progress(t, s0, s0 + 0.6, theme.ease.inOut)
          x = mix(p, from.x, geo.left + geo.w / 2)
          y = mix(p, from.y, geo.rowY(start[rank]) + geo.rowH / 2)
          scale = mix(p, fromScale, (geo.rowH * 0.9) / L.card.h)
          opacity = 1 - progress(t, s0 + 0.35, s0 + 0.6, theme.ease.out)
        } else {
          const s0 = T0 + random(`col-${i}`) * 0.3
          const p = progress(t, s0, s0 + 0.5, theme.ease.in)
          x = mix(p, from.x, L.W / 2)
          y = mix(p, from.y, L.H / 2)
          scale = mix(p, fromScale, fromScale * 0.25)
          opacity = 1 - p
        }
        if (opacity <= 0.01 || x < -400 || x > L.W + 400 || y < -500 || y > L.H + 500) return null
        return (
          <div
            key={a.id}
            style={{
              position: "absolute",
              left: x - L.card.w / 2,
              top: y - L.card.h / 2,
              transform: `scale(${scale})`,
              opacity,
              zIndex: rank !== undefined ? 100 : 1,
            }}
          >
            <ApplicationCard applicant={a} w={L.card.w} h={L.card.h} scanned={1} shadow={false} />
          </div>
        )
      })}
    </AbsoluteFill>
  )
}

const List: React.FC = () => {
  const L = useLayout()
  const { t, fps } = useClock()
  const T0 = at("liste")
  const D = at("detail")
  const geo = listGeometry(L)
  const C = CUES.liste
  const rows = RANKED.slice(0, L.list.rows)

  const s0 = slotsOf(ORDER_START, L.list.rows)
  const s1 = slotsOf(ORDER_MID, L.list.rows)
  const swap1 = springAt(t, T0 + C.tausch1, fps, theme.spring.swap)
  const swap2 = springAt(t, T0 + C.tausch2, fps, theme.spring.swap)

  const cam = listCamera(t, fps)
  const b = breathe(t, 0.6)
  const caption = enter(t, fps, T0 + C.text, D, { rise: 18 })
  const footer = enter(t, fps, T0 + C.fuss, D, { rise: 14 })

  return (
    <AbsoluteFill style={{ transform: `scale(${cam * b.scale}) translateY(${b.y}px)` }}>
      {/* „Sortiert nach Passung." klein über der Liste */}
      <div
        style={{
          position: "absolute",
          left: geo.left,
          top: geo.captionY,
          width: geo.w,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          opacity: caption.opacity,
          transform: `translateY(${caption.y}px)`,
          fontFamily: theme.font.display,
          color: theme.color.text,
        }}
      >
        <span style={{ fontSize: L.list.captionSize, fontWeight: 750, letterSpacing: "-0.02em" }}>{COPY.liste}</span>
        <span style={{ fontSize: L.list.captionSize * 0.6, fontWeight: 500, color: theme.color.textDim }}>
          {JOB.short} · {JOB.total} Bewerbungen
        </span>
      </div>

      {rows.map((c, rank) => {
        if (rank === 0 && t >= D) return null // Platz 1 übernimmt DetailPanel
        const appear = T0 + C.zeilen + s0[rank] * STAGGER
        // Platz 1 bleibt (wird zur Karte), alle anderen gehen gestaffelt beim Zoom
        const exitAt = rank === 0 ? undefined : D + 0.12 + rank * 0.03
        const pin = enter(t, fps, appear, exitAt, { rise: 40, scaleFrom: 0.9 })
        if (pin.opacity <= 0.001) return null
        const y0 = geo.rowY(s0[rank])
        const y1 = geo.rowY(s1[rank])
        const y2 = geo.rowY(rank)
        const y = y0 + (y1 - y0) * swap1 + (y2 - y1) * swap2
        const moving = Math.abs(y1 - y0) * Math.sin(Math.PI * Math.min(1, swap1)) + Math.abs(y2 - y1) * Math.sin(Math.PI * Math.min(1, swap2))
        const lift = Math.min(1, moving / 200)
        // aufsteigende Zeilen weichen nach links aus, absteigende nach rechts,
        // damit man sie aneinander vorbeiziehen sieht
        const dir = Math.sign(y2 - y0 || y1 - y0)
        const side = -dir * lift * 46
        const rankP = springAt(t, T0 + C.raenge + rank * STAGGER, fps, theme.spring.snappy)
        const glowP = rank === 0 ? progress(t, T0 + C.fuss, T0 + C.fuss + 0.5) : 0
        return (
          <div
            key={c.name}
            style={{
              position: "absolute",
              left: geo.left + side,
              top: y + pin.y,
              opacity: pin.opacity,
              transform: `scale(${pin.scale * (1 + lift * 0.03)})`,
              zIndex: Math.round(10 + lift * 50 + (L.list.rows - rank)),
            }}
          >
            <CandidateRow candidate={c} rank={rank + 1} rankP={rankP} glowP={glowP} w={geo.w} h={geo.rowH} />
          </div>
        )
      })}

      <div
        style={{
          position: "absolute",
          left: geo.left,
          top: geo.footerY,
          width: geo.w,
          textAlign: "center",
          fontFamily: theme.font.display,
          fontSize: L.list.captionSize * 0.62,
          fontWeight: 500,
          color: theme.color.textDim,
          opacity: footer.opacity,
          transform: `translateY(${footer.y}px)`,
        }}
      >
        + {JOB.total - L.list.rows} weitere Bewerbungen, ebenfalls bewertet
      </div>
    </AbsoluteFill>
  )
}

/** Bildschirm-Rechteck von Platz 1 in der Liste zum Zeitpunkt t. */
function firstRowRect(L: Layout, t: number, fps: number) {
  const geo = listGeometry(L)
  const s = listCamera(t, fps) * breathe(t, 0.6).scale
  const c = zoomed(L, { x: geo.left, y: geo.rowY(0) + breathe(t, 0.6).y }, s)
  return { x: c.x, y: c.y, w: geo.w * s, h: geo.rowH * s }
}

/** Platz 1 klappt zur Begründungskarte auf. */
const DetailPanel: React.FC = () => {
  const L = useLayout()
  const { t, fps } = useClock()
  const D = at("detail")
  if (t < D) return null
  const C = CUES.detail
  const c = RANKED[0]
  const P = L.detail.panel
  const fs = L.detail.fs

  const from = firstRowRect(L, D, fps)
  const open = springAt(t, D + C.aufklappen - 0.2, fps, theme.spring.smooth)
  const x = mix(open, from.x, P.x)
  const y = mix(open, from.y, P.y)
  const w = mix(open, from.w, P.w)
  const h = mix(open, from.h, P.h)
  // erst geht die Zeile, dann kommt der Kopf der Karte, ohne doppelten Namen
  const rowFade = 1 - progress(t, D + C.aufklappen - 0.3, D + C.aufklappen - 0.1, theme.ease.in)
  const head = enter(t, fps, D + C.aufklappen - 0.05, undefined, { rise: 16 })
  const ringFill = progress(t, D + C.aufklappen + 0.3, D + C.aufklappen + 1.4)
  const b = breathe(t, 0.5, 0.8)

  const shown = EVIDENCE.slice(0, L.detail.evidence)
  const markStart = (k: number) => D + C.belege + k * C.belegAbstand + 0.45
  const rest = CRITERIA.filter((cr) => !shown.some((e) => e.criterion === cr.key))
  const restIn = (k: number) => enter(t, fps, D + C.weitere + k * STAGGER, undefined, { rise: 14, scaleFrom: 0.85 })

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        transform: `translateY(${b.y * open}px)`,
      }}
    >
      <div style={{ position: "absolute", inset: 0, borderRadius: mix(open, 18, 26), background: theme.color.card, boxShadow: theme.panel.shadow }} />

      {rowFade > 0.001 && (
        <div style={{ position: "absolute", left: 0, top: 0, opacity: rowFade, transform: `scale(${from.w / listGeometry(L).w})`, transformOrigin: "0 0" }}>
          <CandidateRow candidate={c} rank={1} rankP={1} w={listGeometry(L).w} h={L.list.rowH} />
        </div>
      )}

      {head.opacity > 0.001 && (
        <div style={{ position: "absolute", left: 0, top: 0, width: P.w, height: P.h, padding: fs * 1.6, boxSizing: "border-box", fontFamily: theme.font.display, overflow: "hidden", opacity: Math.min(1, open * 1.2) }}>
          <div style={{ display: "flex", alignItems: "center", gap: 22, opacity: head.opacity, transform: `translateY(${head.y}px)` }}>
            <Avatar initials={c.initials} size={L.detail.ring * 0.56} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 32, height: 32, borderRadius: "50%", background: theme.color.gradient, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 750, color: "#0C1A16" }}>1</span>
                <span style={{ fontSize: fs * 1.8, fontWeight: 750, color: theme.color.ink, letterSpacing: "-0.015em" }}>{c.name}</span>
              </div>
              <div style={{ fontSize: fs * 1.02, color: theme.color.mutedFg, marginTop: 6, fontWeight: 500 }}>
                {JOB.short} · {c.years} Jahre Erfahrung · {c.city}
              </div>
            </div>
            <ScoreRing size={L.detail.ring} target={c.score} fill={ringFill} value={c.score} id={`ring-${L.format}`} />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: fs * 1.1,
              marginBottom: fs * 0.7,
              paddingTop: fs * 0.9,
              borderTop: `1px solid ${theme.color.border}`,
              fontSize: fs,
              fontWeight: 650,
              color: theme.color.cyanDeep,
              opacity: head.opacity,
            }}
          >
            <ShieldCheck size={fs * 1.15} color={theme.color.cyanDeep} strokeWidth={2} />
            Begründungen &amp; Belege
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: fs * 0.6 }}>
            {shown.map((e, k) => {
              const crit = CRITERIA.find((cr) => cr.key === e.criterion)!
              const s = D + C.belege + k * C.belegAbstand
              const item = enter(t, fps, s, undefined, { rise: 26, scaleFrom: 0.97 })
              const nextMark = k < shown.length - 1 ? markStart(k + 1) : D + C.weitere
              const markGlow = progress(t, markStart(k), markStart(k) + 0.3) * (1 - progress(t, nextMark, nextMark + 0.3))
              return (
                <div key={e.criterion} style={{ opacity: item.opacity, transform: `translateY(${item.y}px) scale(${item.scale})` }}>
                  <EvidenceItem
                    criterion={crit}
                    evidence={e}
                    w={P.w - fs * 3.2}
                    fs={fs}
                    bar={progress(t, s + 0.1, s + 0.8)}
                    quoteIn={springAt(t, s + 0.22, fps, theme.spring.snappy)}
                    mark={progress(t, markStart(k), markStart(k) + 0.45, theme.ease.inOut)}
                    markGlow={markGlow}
                  />
                </div>
              )
            })}
          </div>

          {/* übrige Kriterien als Chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: fs * 0.45, marginTop: fs * 0.8 }}>
            {rest.map((cr, k) => {
              const r = restIn(k)
              return (
                <span
                  key={cr.key}
                  style={{
                    opacity: r.opacity,
                    transform: `translateY(${r.y}px) scale(${r.scale})`,
                    fontSize: fs * 0.78,
                    fontWeight: 600,
                    color: theme.color.ink,
                    background: theme.color.muted,
                    borderRadius: 99,
                    padding: `${fs * 0.25}px ${fs * 0.6}px`,
                    display: "inline-flex",
                    gap: fs * 0.4,
                  }}
                >
                  {cr.label}
                  <span style={{ color: scoreTextColor(cr.score), fontWeight: 750 }}>{cr.score}</span>
                </span>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

const DetailText: React.FC = () => {
  const L = useLayout()
  const T = L.detail.text
  return (
    <div
      style={{
        position: "absolute",
        left: T.x,
        top: T.y,
        width: T.w,
        transform: L.format === "landscape" ? "translateY(-50%)" : undefined,
      }}
    >
      <StageText text={COPY.detail} start={at("detail", CUES.detail.text)} size={T.size} maxW={T.w} />
    </div>
  )
}
