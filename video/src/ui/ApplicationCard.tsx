import React from "react"

import { JOB, type Applicant } from "../data/mock"
import { theme } from "../config/theme"
import { mix } from "../lib/time"
import { Avatar } from "./Avatar"

/**
 * Abstrahierte Bewerbung: Kopf mit Person, darunter angedeutete Textzeilen.
 * `captured` (0..1) ist der Zustand nach dem Verlauf: Karte wird leicht grün
 * hinterlegt und bekommt oben eine Verlaufskante.
 */
export const ApplicationCard: React.FC<{
  applicant: Applicant
  w: number
  h: number
  captured?: number
}> = ({ applicant, w, h, captured = 0 }) => {
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
        border: `1px solid ${theme.color.border}`,
        boxShadow: theme.shadow.card,
        overflow: "hidden",
      }}
    >
      {/* grüne Hinterlegung nach dem Erfassen */}
      <div style={{ position: "absolute", inset: 0, background: theme.color.greenWash, opacity: captured * 0.8 }} />
      {/* Verlaufskante oben */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          right: 0,
          height: h * 0.045,
          backgroundImage: theme.color.gradient,
          transformOrigin: "0 50%",
          transform: `scaleX(${captured})`,
        }}
      />

      <div style={{ position: "absolute", left: pad, top: h * 0.1, display: "flex", alignItems: "center", gap: w * 0.05 }}>
        <Avatar initials={applicant.initials} size={w * 0.2} />
        <div style={{ fontFamily: theme.font.display, lineHeight: 1.2 }}>
          <div style={{ fontSize: w * 0.064, fontWeight: 700, color: theme.color.ink }}>{applicant.name}</div>
          <div style={{ fontSize: w * 0.044, fontWeight: 500, color: theme.color.mutedFg, marginTop: w * 0.01 }}>
            {JOB.short}
          </div>
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

      {/* Dateiangaben unten */}
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
          <span
            key={f}
            style={{
              padding: `${w * 0.012}px ${w * 0.03}px`,
              borderRadius: 99,
              background: `rgba(43,97,105,${mix(captured, 0.08, 0.12)})`,
            }}
          >
            {f}
          </span>
        ))}
      </div>
    </div>
  )
}
