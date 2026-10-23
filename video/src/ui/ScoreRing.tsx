import React from "react"

import { scoreTextColor, theme } from "../config/theme"

/**
 * Gesamt-Score als Ring, nachgebaut nach CircularProgress
 * (candidate-match-modal.tsx) mit dem Verlaufsstrich aus score-gauge.tsx.
 * `fill` (0..1) zeichnet den Ring, `value` ist die angezeigte Zahl.
 */
export const ScoreRing: React.FC<{ size: number; target: number; fill: number; value: number; id: string }> = ({
  size,
  target,
  fill,
  value,
  id,
}) => {
  const stroke = size * 0.085
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (target / 100) * fill * circ

  return (
    <div style={{ position: "relative", width: size, height: size, flex: "none" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={theme.color.cyan} />
            <stop offset="100%" stopColor={theme.color.green} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E2E8F0" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          opacity={fill > 0.001 ? 1 : 0}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: theme.font.display,
        }}
      >
        <span
          style={{
            fontSize: size * 0.27,
            fontWeight: 750,
            letterSpacing: "-0.03em",
            fontVariantNumeric: "tabular-nums",
            color: scoreTextColor(target),
            lineHeight: 1,
          }}
        >
          {Math.round(value)}%
        </span>
        <span style={{ fontSize: size * 0.1, color: theme.color.mutedFg, marginTop: size * 0.03, fontWeight: 500 }}>
          Match
        </span>
      </div>
    </div>
  )
}
