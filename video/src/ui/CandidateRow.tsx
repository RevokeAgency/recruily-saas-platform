import React from "react"
import { ChevronRight } from "lucide-react"

import { scoreColor, theme } from "../config/theme"
import type { RankedCandidate } from "../data/mock"
import { Avatar } from "./Avatar"

/**
 * Zeile der Kandidatenliste, nachgebaut nach
 * components/jobs/detail/candidates-tab.tsx (Listenansicht):
 * Rang-Badge (Platz 1 im Verlauf), Avatar, Name, Eckdaten, Score in %.
 *
 * `rankOpacity` blendet das Rang-Badge ein (erst nach dem Sortieren),
 * `score` ist der aktuell angezeigte (hochzählende) Wert.
 */
export const CandidateRow: React.FC<{
  candidate: RankedCandidate
  rank: number
  rankOpacity: number
  score: number
  w: number
  h: number
}> = ({ candidate, rank, rankOpacity, score, w, h }) => {
  const fs = h * 0.235
  const badge = h * 0.3
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: 18,
        background: theme.color.card,
        border: `1px solid ${theme.color.border}`,
        boxShadow: theme.shadow.card,
        display: "flex",
        alignItems: "center",
        gap: h * 0.24,
        padding: `0 ${h * 0.32}px 0 ${h * 0.26}px`,
        boxSizing: "border-box",
        fontFamily: theme.font.display,
      }}
    >
      <Avatar initials={candidate.initials} size={h * 0.56} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: h * 0.12 }}>
          <span
            style={{
              width: badge * rankOpacity,
              height: badge,
              marginRight: rankOpacity < 0.01 ? -h * 0.12 : 0,
              borderRadius: "50%",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              opacity: rankOpacity,
              fontSize: badge * 0.52,
              fontWeight: 700,
              background: rank === 1 ? theme.color.gradient : theme.color.muted,
              color: rank === 1 ? "#0C1A16" : theme.color.mutedFg,
            }}
          >
            {rank}
          </span>
          <span style={{ fontSize: fs, fontWeight: 650, color: theme.color.ink }}>{candidate.name}</span>
        </div>
        <div style={{ fontSize: fs * 0.72, color: theme.color.mutedFg, marginTop: h * 0.03, fontWeight: 500 }}>
          {candidate.years} Jahre Erfahrung · {candidate.city}
        </div>
      </div>

      <span
        style={{
          fontSize: fs * 1.22,
          fontWeight: 750,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.02em",
          // Farbe nach dem Endwert, sonst flackert sie beim Hochzählen rot → amber → grün.
          color: scoreColor(candidate.score),
          minWidth: fs * 3.1,
          textAlign: "right",
        }}
      >
        {Math.round(score)}%
      </span>
      <ChevronRight size={h * 0.24} color="rgba(102,112,133,.5)" strokeWidth={2} />
    </div>
  )
}
