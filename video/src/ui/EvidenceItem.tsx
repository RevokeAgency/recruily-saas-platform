import React from "react"

import { scoreColor, scoreTextColor, theme } from "../config/theme"
import type { Criterion, Evidence } from "../data/mock"
import { CriterionIcon } from "./CriterionIcon"

/**
 * Begründung pro Kriterium mit Beleg, nachgebaut nach dem Prüfprotokoll in
 * candidate-match-modal.tsx (Kopfzeile mit Score und Konfidenz, Begründung)
 * und dem Zitatblock aus document-findings.tsx (Quelle in Versalien, Zitat
 * mit Randlinie). Quelle ohne Seitenangabe, wie im Produkt.
 *
 * `bar` (0..1) füllt den Balken, `mark` (0..1) zieht die Markierung unter das
 * Zitat.
 */
export const EvidenceItem: React.FC<{
  criterion: Criterion
  evidence: Evidence
  w: number
  fs: number
  bar: number
  mark: number
}> = ({ criterion, evidence, w, fs, bar, mark }) => {
  const pad = fs * 1.05
  return (
    <div
      style={{
        width: w,
        boxSizing: "border-box",
        borderRadius: 18,
        border: `1px solid ${theme.color.border}`,
        background: theme.color.card,
        padding: pad,
        fontFamily: theme.font.display,
      }}
    >
      {/* Kopf: Icon, Kriterium, Gewichtung, Score, Konfidenz */}
      <div style={{ display: "flex", alignItems: "center", gap: fs * 0.55 }}>
        <div
          style={{
            width: fs * 1.75,
            height: fs * 1.75,
            borderRadius: fs * 0.45,
            background: theme.color.muted,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CriterionIcon icon={criterion.icon} size={fs * 0.9} color={theme.color.mutedFg} />
        </div>
        <span style={{ fontSize: fs * 1.02, fontWeight: 700, color: theme.color.ink }}>{criterion.label}</span>
        <span
          style={{
            fontSize: fs * 0.7,
            color: theme.color.mutedFg,
            background: theme.color.muted,
            borderRadius: 6,
            padding: `${fs * 0.1}px ${fs * 0.35}px`,
            fontWeight: 500,
          }}
        >
          {criterion.weight}% Gewichtung
        </span>
        <span style={{ flex: 1 }} />
        <span
          style={{
            fontSize: fs * 0.7,
            color: theme.color.mutedFg,
            background: theme.color.muted,
            borderRadius: 99,
            padding: `${fs * 0.1}px ${fs * 0.45}px`,
            fontWeight: 500,
          }}
        >
          Konfidenz hoch
        </span>
        <span
          style={{
            fontSize: fs * 1.15,
            fontWeight: 750,
            color: scoreTextColor(criterion.score),
            fontVariantNumeric: "tabular-nums",
            minWidth: fs * 1.9,
            textAlign: "right",
          }}
        >
          {criterion.score}
        </span>
      </div>

      {/* Balken */}
      <div style={{ marginTop: fs * 0.6, height: fs * 0.36, borderRadius: 99, background: theme.color.muted, overflow: "hidden" }}>
        <div
          style={{
            width: `${criterion.score * bar}%`,
            height: "100%",
            borderRadius: 99,
            background: scoreColor(criterion.score),
          }}
        />
      </div>

      <div style={{ marginTop: fs * 0.65, fontSize: fs * 0.92, lineHeight: 1.42, color: "#475467", fontWeight: 500 }}>
        {evidence.begruendung}
      </div>

      {/* Beleg aus den Unterlagen */}
      <div style={{ marginTop: fs * 0.6 }}>
        <div
          style={{
            fontFamily: theme.font.support,
            fontSize: fs * 0.62,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: theme.color.teal,
          }}
        >
          Beleg · {evidence.quelle}
        </div>
        <div
          style={{
            marginTop: fs * 0.3,
            borderLeft: `3px solid ${theme.color.greenDeep}`,
            paddingLeft: fs * 0.6,
            fontSize: fs * 0.9,
            lineHeight: 1.45,
            color: theme.color.ink,
            fontWeight: 500,
          }}
        >
          <span
            style={{
              // Markierung wie ein Textmarker, läuft von links nach rechts.
              backgroundImage: "linear-gradient(90deg, rgba(34,193,238,.20), rgba(22,199,124,.24))",
              backgroundRepeat: "no-repeat",
              backgroundSize: `${mark * 100}% 100%`,
              boxDecorationBreak: "clone",
              WebkitBoxDecorationBreak: "clone",
              padding: "0 2px",
            }}
          >
            „{evidence.zitat}“
          </span>
        </div>
      </div>
    </div>
  )
}
