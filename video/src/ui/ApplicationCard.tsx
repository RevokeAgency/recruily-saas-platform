import React from "react"

import { theme } from "../config/theme"
import { JOB, type Applicant } from "../data/mock"
import { mix } from "../lib/time"
import { Avatar } from "./Avatar"

/**
 * Abstrahierte Bewerbung: Kopf mit Person, angedeutete Textzeilen, Dateien.
 * Hell, liegt als Panel auf der dunklen Bühne.
 *
 * `scanned` (0..1): vom Scan erfasst, Karte bekommt oben eine Verlaufskante.
 * `dim` (0..1): ungelesen, Karte tritt in die Bühne zurück.
 */
export const ApplicationCard: React.FC<{
  applicant: Applicant
  w: number
  h: number
  scanned?: number
  dim?: number
  shadow?: boolean
}> = ({ applicant, w, h, scanned = 0, dim = 0, shadow = true }) => {
  const pad = w * 0.09
  const bar = (width: string, top: number, strong = false) => (
    <div
      style={{
        position: "absolute",
        left: pad,
        top,
        width,
        height: h * 0.026,
        borderRadius: 99,
        background: strong ? "#DCE2E6" : theme.color.skeleton,
      }}
    />
  )
  const line0 = h * 0.33

  return (
    <div
      style={{
        position: "relative",
        width: w,
        height: h,
        borderRadius: w * 0.07,
        background: theme.color.card,
        boxShadow: shadow ? theme.panel.shadowSmall : undefined,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          right: 0,
          height: h * 0.04,
          backgroundImage: theme.color.gradient,
          transformOrigin: "0 50%",
          transform: `scaleX(${scanned})`,
        }}
      />

      <div style={{ position: "absolute", left: pad, top: h * 0.1, display: "flex", alignItems: "center", gap: w * 0.05 }}>
        <Avatar initials={applicant.initials} size={w * 0.2} />
        <div style={{ fontFamily: theme.font.display, lineHeight: 1.2 }}>
          <div style={{ fontSize: w * 0.064, fontWeight: 700, color: theme.color.ink }}>{applicant.name}</div>
          <div style={{ fontSize: w * 0.044, fontWeight: 500, color: theme.color.mutedFg, marginTop: w * 0.01 }}>{JOB.short}</div>
        </div>
      </div>

      {bar("38%", line0, true)}
      {bar("82%", line0 + h * 0.07)}
      {bar("74%", line0 + h * 0.12)}
      {bar("80%", line0 + h * 0.17)}
      {bar("30%", line0 + h * 0.27, true)}
      {bar("78%", line0 + h * 0.34)}
      {bar("64%", line0 + h * 0.39)}
      {bar("70%", line0 + h * 0.44)}

      <div
        style={{
          position: "absolute",
          left: pad,
          bottom: h * 0.07,
          display: "flex",
          gap: w * 0.025,
          fontFamily: theme.font.support,
          fontSize: w * 0.04,
          fontWeight: 600,
          color: theme.color.teal,
        }}
      >
        {["Lebenslauf.pdf", "Anschreiben.pdf"].map((f) => (
          <span key={f} style={{ padding: `${w * 0.012}px ${w * 0.03}px`, borderRadius: 99, background: "rgba(43,97,105,.09)" }}>
            {f}
          </span>
        ))}
      </div>

      {/* ungelesen: Karte sinkt in die Bühne */}
      {dim > 0.001 && (
        <div style={{ position: "absolute", inset: 0, background: theme.color.stage, opacity: mix(dim, 0, 0.62) }} />
      )}
    </div>
  )
}
