import React from "react"
import { AbsoluteFill } from "remotion"

import { COPY } from "../config/copy"
import { useLayout } from "../config/layout"
import { glow, theme } from "../config/theme"
import { at, CUES } from "../config/timing"
import { APPLICANTS } from "../data/mock"
import { gridCell, zoomed } from "../lib/grid"
import { mix, progress, useClock, within } from "../lib/time"
import { ApplicationCard } from "../ui/ApplicationCard"
import { StageText } from "../ui/StageText"

/** Kamera im Scan: nah am Raster, driftet langsam. Wird auch vom Listen-Kollaps genutzt. */
export function scanCamera(L: ReturnType<typeof useLayout>, t: number) {
  const p = progress(t, at("scan"), at("liste"), theme.ease.inOut)
  return {
    zoom: mix(p, L.scan.zoom, L.scan.zoom * 0.94),
    dx: mix(p, 40, -40),
    dy: mix(p, -L.H * 0.06, L.H * 0.06),
  }
}

/** x-Position der Scan-Linie auf dem Bildschirm. */
export function scanLineX(L: ReturnType<typeof useLayout>, t: number) {
  const p = progress(t, at("scan", CUES.scan.linieStart), at("scan", CUES.scan.linieEnde), theme.ease.inOut)
  return mix(p, -80, L.W + 80)
}

/**
 * AKT 3a — Raster im ganzen Bild, gedimmt. Eine Scan-Linie mit Glow läuft
 * durch und lässt jede Karte beim Durchgang kurz aufleuchten; danach ist sie
 * hell und trägt die Verlaufskante.
 */
export const Act3Scan: React.FC = () => {
  const L = useLayout()
  const { t } = useClock()
  if (!within(t, at("scan"), at("liste"))) return null

  const cam = scanCamera(L, t)
  const lineX = scanLineX(L, t)
  const lineOn = within(t, at("scan", CUES.scan.linieStart), at("scan", CUES.scan.linieEnde + 0.1))

  return (
    <AbsoluteFill>
      {APPLICANTS.map((a, i) => {
        const g = gridCell(L, i)
        const s = zoomed(L, g, cam.zoom, cam.dx, cam.dy)
        const w = L.card.w * g.scale * cam.zoom
        if (s.x < -w || s.x > L.W + w || s.y < -w * 1.4 || s.y > L.H + w * 1.4) return null
        const d = lineX - s.x
        const scanned = Math.min(1, Math.max(0, d / 90))
        const flash = d > 0 ? Math.exp(-d / 160) : 0
        return (
          <div
            key={a.id}
            style={{
              position: "absolute",
              left: s.x - L.card.w / 2,
              top: s.y - L.card.h / 2,
              transform: `scale(${g.scale * cam.zoom * (1 + flash * 0.05)})`,
              filter: flash > 0.02 ? `brightness(${1 + flash * 0.35})` : undefined,
            }}
          >
            <ApplicationCard applicant={a} w={L.card.w} h={L.card.h} scanned={scanned} dim={1 - scanned} shadow={false} />
          </div>
        )
      })}

      {/* Scan-Linie: das eine leuchtende Element */}
      {lineOn && (
        <div
          style={{
            position: "absolute",
            left: lineX - 2,
            top: 0,
            width: 4,
            height: L.H,
            background: `linear-gradient(180deg, ${theme.color.cyan} 0%, ${theme.color.green} 100%)`,
            boxShadow: glow(theme.color.cyan, 1),
          }}
        />
      )}
      {lineOn && (
        <div
          style={{
            position: "absolute",
            left: lineX - 220,
            top: 0,
            width: 220,
            height: L.H,
            background: "linear-gradient(90deg, rgba(34,193,238,0) 0%, rgba(34,193,238,0.10) 100%)",
          }}
        />
      )}

      {/* Text auf dunklem Streifen, damit er über den Karten lesbar bleibt */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            position: "absolute",
            width: "120%",
            height: L.scan.textSize * 3.2,
            background: "radial-gradient(ellipse at center, rgba(8,19,20,0.92) 0%, rgba(8,19,20,0.75) 45%, rgba(8,19,20,0) 72%)",
            opacity: progress(t, at("scan", CUES.scan.text - 0.1), at("scan", CUES.scan.text + 0.3)),
          }}
        />
        <StageText
          text={`${COPY.scan.marke} ${COPY.scan.rest}`}
          start={at("scan", CUES.scan.text)}
          end={at("liste")}
          size={L.scan.textSize}
          align="center"
        />
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
