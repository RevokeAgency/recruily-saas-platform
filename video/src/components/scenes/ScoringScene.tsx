import React from "react"
import { AbsoluteFill } from "remotion"

import { DEMO_COPY } from "../../config/copy"
import { DEMO_CUES, HANDOFF, SCENE, sat } from "../../config/demo-timing"
import { theme } from "../../config/theme"
import { STAGGER } from "../../config/timing"
import { DEMO_LIST, DEMO_STATS, DEMO_UPLOAD } from "../../data/mock"
import { mix, progress, springAt, useClock, within } from "../../lib/time"
import { AppShell } from "../app/AppShell"
import { CandidateDashboard } from "../app/CandidateDashboard"
import { CandidateSheet } from "../app/CandidateSheet"
import { countUp } from "../motion/countUp"
import { KineticText } from "../motion/KineticText"
import { Tilt3D } from "../motion/Tilt3D"

const WIN = { w: 1280, h: 800, scale: 1.08 }

/**
 * SZENE 3 — Applicant Scoring & Analytics. Das Dashboard liegt gekippt im
 * Raum, Kennzahlen zählen, Zeilen kommen gestaffelt. Dann fährt die Kamera
 * weich auf die oberste Kandidatin, die Ansicht wird flach und das Sheet mit
 * der KI-Zusammenfassung schiebt sich nach vorn.
 */
export const ScoringScene: React.FC = () => {
  const { t, fps } = useClock()
  const S0 = SCENE.scoring
  if (!within(t, S0 - HANDOFF, SCENE.outro + 0.05)) return null
  const C = DEMO_CUES.scoring
  const at = (o: number) => sat("scoring", o)

  const inP = springAt(t, S0 - HANDOFF / 2, fps, { damping: 20, stiffness: 65, mass: 1.1 })
  const zoom = springAt(t, at(C.zoom), fps, { damping: 24, stiffness: 55, mass: 1.1 })
  const out = progress(t, SCENE.outro - HANDOFF, SCENE.outro, theme.ease.in)
  const drift = { x: Math.sin(t * 0.5) * 2, y: Math.cos(t * 0.42) * 1.5 }

  const rowP = DEMO_LIST.map((_, k) => springAt(t, at(C.zeilen + k * STAGGER), fps, theme.spring.snappy))
  const statP = DEMO_STATS.map((_, i) => springAt(t, at(C.statistik + i * STAGGER), fps, theme.spring.snappy))
  const stats = DEMO_STATS.map((s, i) => countUp(t, at(C.statistik + i * STAGGER), fps, s.value))
  const highlight = progress(t, at(C.hover), at(C.hover + 0.4)) * (1 - progress(t, at(C.sheet), at(C.sheet + 0.4)))

  // Sheet und Inhalte
  const sheet = springAt(t, at(C.sheet), fps, { damping: 22, stiffness: 80, mass: 1 })
  const summaryP = springAt(t, at(C.summary), fps, theme.spring.smooth)
  const marks = C.marker.map((m) => progress(t, at(m), at(m + 0.5), theme.ease.inOut))
  const active = C.marker.reduce((acc, m, k) => (t >= at(m) ? k : acc), -1)
  const pitchP = DEMO_UPLOAD.pitch.map((_, k) => springAt(t, at(C.gruende + k * STAGGER * 2), fps, theme.spring.snappy))
  const invite = progress(t, at(C.einladen), at(C.einladen + 0.4))
  // Hero: zuerst die hervorgehobene Zeile, dann der aktive Marker, dann der Button
  const markerActive = invite > 0.05 ? -1 : active

  // Kamera: von gekippt (isometrisch) zu flach und nah an Zeile 1
  const rx = mix(inP, 30, 20) + drift.y
  const ry = mix(inP, 40, -16) + drift.x
  const rz = mix(inP, -6, 4)
  const cam = {
    rx: mix(zoom, rx, 2),
    ry: mix(zoom, ry, -2),
    rz: mix(zoom, rz, 0),
    scale: WIN.scale * mix(inP, 0.7, 1) * mix(zoom, 1, 1.55),
    // Zoom-Ziel: Zeile 1 (Sarah Lindner) links im Bild, rechts ist Platz für das Sheet
    x: mix(inP, 700, 0) + mix(zoom, 0, 170),
    y: mix(inP, 60, 0) + mix(zoom, 0, 70),
  }

  return (
    <AbsoluteFill style={{ opacity: 1 - out, transform: `scale(${mix(out, 1, 0.86)})`, filter: out > 0.01 ? `blur(${out * 6}px)` : undefined }}>
      {/* Dashboard im Raum */}
      <div style={{ position: "absolute", left: 960 - WIN.w / 2, top: 560 - WIN.h / 2, opacity: Math.min(1, inP * 1.4), filter: sheet > 0.01 ? `blur(${Math.min(1, sheet) * 3}px)` : undefined }}>
        <Tilt3D rotateX={cam.rx} rotateY={cam.ry} rotateZ={cam.rz} scale={cam.scale} x={cam.x} y={cam.y} sheen={0.7}>
          <AppShell active="Stellenangebote" width={WIN.w} height={WIN.h}>
            <CandidateDashboard rowP={rowP} stats={stats} statP={statP} highlight={highlight} />
            {/* zurücktreten, wenn das Sheet vorn ist */}
            <div style={{ position: "absolute", inset: 0, background: theme.color.stage, opacity: Math.min(1, sheet) * 0.6, pointerEvents: "none" }} />
          </AppShell>
        </Tilt3D>
      </div>

      {/* Sheet mit der KI-Zusammenfassung */}
      {sheet > 0.001 && (
        <div style={{ position: "absolute", left: 1400 - 300, top: 540 - 350, height: 700 }}>
          <Tilt3D
            rotateY={mix(sheet, -35, -8) + Math.sin(t * 0.5) * 1.2}
            rotateX={mix(sheet, 10, 2) + Math.cos(t * 0.4) * 0.8}
            scale={mix(Math.min(sheet, 1.1), 0.8, 1.18)}
            x={mix(sheet, 600, 0)}
            sheen={0.5}
            radius={24}
          >
            <div style={{ height: 700, opacity: Math.min(1, sheet * 1.5) }}>
              <CandidateSheet summaryP={Math.min(1, summaryP)} marks={marks} active={markerActive} pitchP={pitchP} invite={invite} />
            </div>
          </Tilt3D>
        </div>
      )}

      {/* Captions: erst oben links, beim Zoom unten links auf dunklem Grund */}
      <div style={{ position: "absolute", left: 120, top: 70, width: 900 }}>
        <KineticText text={DEMO_COPY.scoring1} start={at(C.caption1)} end={at(C.zoom)} size={64} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: 1100,
          height: 420,
          background: "radial-gradient(70% 80% at 18% 100%, rgba(8,19,20,.92) 0%, rgba(8,19,20,.7) 45%, rgba(8,19,20,0) 75%)",
          opacity: progress(t, at(C.caption2 - 0.2), at(C.caption2 + 0.3)),
        }}
      />
      <div style={{ position: "absolute", left: 120, bottom: 110, width: 700 }}>
        <KineticText text={DEMO_COPY.scoring2} start={at(C.caption2)} end={SCENE.outro} size={72} maxW={620} />
      </div>
    </AbsoluteFill>
  )
}
