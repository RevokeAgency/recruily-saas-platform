import React from "react"

import { glow, scoreColor, scoreTextColor, theme } from "../config/theme"
import type { Criterion, Evidence } from "../data/mock"
import { mix } from "../lib/time"
import { CriterionIcon } from "./CriterionIcon"

/**
 * Begründung pro Kriterium mit Beleg, nachgebaut nach dem Prüfprotokoll in
 * candidate-match-modal.tsx (Kopfzeile mit Score und Konfidenz, Begründung)
 * und dem Zitatblock aus document-findings.tsx (Quelle in Versalien, Zitat
 * mit Randlinie). Quelle ohne Seitenangabe, wie im Produkt.
 *
 * `bar`      füllt den Balken
 * `quoteIn`  Zitat fährt von links ein
 * `mark`     Cyan-Marker zieht sich unter das Zitat
 * `markGlow` Glow des Markers (nur der aktuelle Beleg leuchtet)
 */
export const EvidenceItem: React.FC<{
  criterion: Criterion
  evidence: Evidence
  w: number
  fs: number
  bar: number
  quoteIn: number
  mark: number
  markGlow: number
}> = ({ criterion, evidence, w, fs, bar, quoteIn, mark, markGlow }) => {
  const chip: React.CSSProperties = {
    fontSize: fs * 0.7,
    color: theme.color.mutedFg,
    background: theme.color.muted,
    borderRadius: 99,
    padding: `${fs * 0.12}px ${fs * 0.45}px`,
    fontWeight: 500,
    whiteSpace: "nowrap",
  }
  return (
    <div
      style={{
        width: w,
        boxSizing: "border-box",
        borderRadius: 18,
        border: `1px solid ${theme.color.border}`,
        background: theme.color.card,
        padding: `${fs * 0.85}px ${fs}px`,
        fontFamily: theme.font.display,
      }}
    >
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
            flex: "none",
          }}
        >
          <CriterionIcon icon={criterion.icon} size={fs * 0.9} color={theme.color.mutedFg} />
        </div>
        <span style={{ fontSize: fs * 1.05, fontWeight: 700, color: theme.color.ink }}>{criterion.label}</span>
        <span style={chip}>{criterion.weight}% Gewichtung</span>
        <span style={{ flex: 1 }} />
        <span style={chip}>Konfidenz hoch</span>
        <span
          style={{
            fontSize: fs * 1.2,
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

      <div style={{ marginTop: fs * 0.55, height: fs * 0.34, borderRadius: 99, background: theme.color.muted, overflow: "hidden" }}>
        <div style={{ width: `${criterion.score * bar}%`, height: "100%", borderRadius: 99, background: scoreColor(criterion.score) }} />
      </div>

      <div style={{ marginTop: fs * 0.55, fontSize: fs * 0.92, lineHeight: 1.4, color: theme.color.body, fontWeight: 500 }}>
        {evidence.begruendung}
      </div>

      {/* Beleg aus den Unterlagen, fährt von links ein */}
      <div
        style={{
          marginTop: fs * 0.55,
          opacity: Math.min(1, quoteIn * 1.4),
          transform: `translateX(${mix(quoteIn, -60, 0)}px)`,
        }}
      >
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
            marginTop: fs * 0.25,
            borderLeft: `3px solid ${theme.color.greenDeep}`,
            paddingLeft: fs * 0.6,
            fontSize: fs * 0.95,
            lineHeight: 1.45,
            color: theme.color.ink,
            fontWeight: 550,
          }}
        >
          <span style={{ position: "relative", display: "inline-block" }}>
            „{evidence.zitat}“
            <span
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: -fs * 0.12,
                height: fs * 0.16,
                borderRadius: 99,
                // nur der aktuelle Beleg trägt die volle Hero-Farbe, erledigte treten zurück
                background: theme.color.cyan,
                opacity: mark >= 1 && markGlow < 0.05 ? 0.3 : 1,
                transformOrigin: "0 50%",
                transform: `scaleX(${mark})`,
                boxShadow: markGlow > 0.01 ? glow(theme.color.cyan, markGlow * 0.7) : undefined,
              }}
            />
          </span>
        </div>
      </div>
    </div>
  )
}
