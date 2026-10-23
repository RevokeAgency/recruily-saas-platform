import React from "react"
import { ChevronRight } from "lucide-react"

import { glow, scoreColor, theme } from "../config/theme"
import type { RankedCandidate } from "../data/mock"
import { mix } from "../lib/time"
import { Avatar } from "./Avatar"

/**
 * Zeile der Kandidatenliste, nachgebaut nach
 * components/jobs/detail/candidates-tab.tsx (Listenansicht):
 * Rang-Badge (Platz 1 im Verlauf), Avatar, Name, Eckdaten, Score in %.
 *
 * Der Score steht immer genau so da, wie er in data/mock.ts steht.
 * `rankP` (0..1) lässt das Rang-Badge aufploppen, `glowP` (0..1) ist der
 * Hero-Glow für Platz 1.
 */
export const CandidateRow: React.FC<{
  candidate: RankedCandidate
  rank: number
  rankP: number
  glowP?: number
  w: number
  h: number
}> = ({ candidate, rank, rankP, glowP = 0, w, h }) => {
  const fs = h * 0.235
  const badge = h * 0.32
  const first = rank === 1
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: 18,
        background: theme.color.card,
        boxShadow: glowP > 0.01 ? `${theme.panel.shadowSmall}, ${glow(theme.color.cyan, glowP * 0.8)}` : theme.panel.shadowSmall,
        display: "flex",
        alignItems: "center",
        gap: h * 0.22,
        padding: `0 ${h * 0.32}px 0 ${h * 0.26}px`,
        boxSizing: "border-box",
        fontFamily: theme.font.display,
      }}
    >
      {/* Platz für das Rang-Badge ist immer reserviert, damit nichts springt */}
      <span
        style={{
          width: badge,
          height: badge,
          flex: "none",
          borderRadius: "50%",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: badge * 0.5,
          fontWeight: 750,
          fontVariantNumeric: "tabular-nums",
          opacity: Math.min(1, rankP * 1.5),
          transform: `scale(${mix(rankP, 0.4, 1)})`,
          background: first ? theme.color.gradient : theme.color.muted,
          color: first ? "#0C1A16" : theme.color.mutedFg,
        }}
      >
        {rank}
      </span>
      <Avatar initials={candidate.initials} size={h * 0.56} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: fs, fontWeight: 650, color: theme.color.ink }}>{candidate.name}</div>
        <div style={{ fontSize: fs * 0.72, color: theme.color.mutedFg, marginTop: h * 0.03, fontWeight: 500 }}>
          {candidate.years} Jahre Erfahrung · {candidate.city}
        </div>
      </div>

      <span
        style={{
          fontSize: fs * 1.25,
          fontWeight: 750,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.02em",
          color: scoreColor(candidate.score),
        }}
      >
        {candidate.score}%
      </span>
      <ChevronRight size={h * 0.24} color="rgba(102,112,133,.5)" strokeWidth={2} />
    </div>
  )
}
