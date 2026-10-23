import React from "react"
import { Img, staticFile } from "remotion"

import { theme } from "../../config/theme"
import { STAGGER } from "../../config/timing"
import { breathe, mix, progress, springAt, useClock } from "../../lib/time"
import parts from "../../../public/logo/parts.json"

/**
 * Negativ-Logo, das sich aus Badge, R-Bauteilen und Buchstaben aufbaut
 * (Teile aus scripts/logo_parts.py). Danach atmet es leicht.
 *
 *   start  Beginn des Aufbaus (Sekunden, absolut)
 *   width  Breite des ganzen Logos in px
 *   halo   Stärke des Scheins hinter dem Badge (Hero)
 */
export const RevetlyLogo: React.FC<{ start: number; width: number; halo?: number; exit?: number }> = ({ start, width, halo = 1, exit = 0 }) => {
  const { t, fps } = useClock()
  if (t < start - 0.05) return null
  const scale = width / parts.width
  const H = parts.height * scale
  const b = breathe(t, 0.8, 0.7)

  const badgeP = springAt(t, start, fps, theme.spring.logo)
  const haloP = progress(t, start + 0.1, start + 0.8) * halo

  const piece = (file: string, cx: number, cy: number, p: number, from: { x: number; y: number; r: number; s: number }) => (
    <Img
      key={file}
      src={staticFile(`logo/${file}`)}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: parts.width * scale,
        height: H,
        opacity: Math.min(1, p * 2),
        transformOrigin: `${cx * scale}px ${cy * scale}px`,
        transform: `translate(${mix(p, from.x, 0)}px, ${mix(p, from.y, 0)}px) rotate(${mix(p, from.r, 0)}deg) scale(${mix(p, from.s, 1)})`,
      }}
    />
  )

  return (
    <div
      style={{
        position: "relative",
        width,
        height: H,
        transform: `scale(${b.scale * (1 - exit * 0.06)}) translateY(${b.y}px)`,
        opacity: 1 - exit,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: parts.badge.cx * scale - H * 1.1,
          top: parts.badge.cy * scale - H * 1.1,
          width: H * 2.2,
          height: H * 2.2,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(34,193,238,0.42) 0%, rgba(34,193,238,0.12) 40%, rgba(34,193,238,0) 70%)",
          opacity: haloP,
        }}
      />
      {piece(parts.badge.file, parts.badge.cx, parts.badge.cy, badgeP, { x: 0, y: 30, r: -24, s: 0.3 })}
      {parts.r.map((r, k) =>
        piece(r.file, r.cx, r.cy, springAt(t, start + 0.3 + k * STAGGER, fps, theme.spring.logo), {
          x: k === 0 ? -70 : 50,
          y: k === 0 ? -80 : 90,
          r: k === 0 ? -30 : 24,
          s: 0.7,
        }),
      )}
      {parts.letters.map((l, k) => {
        const p = springAt(t, start + 0.5 + k * (STAGGER * 0.8), fps, theme.spring.snappy)
        return (
          <div key={l.file} style={{ position: "absolute", inset: 0, filter: p < 0.98 ? `blur(${mix(Math.min(1, p), 6, 0)}px)` : undefined }}>
            {piece(l.file, l.cx, l.cy, p, { x: 0, y: 50, r: 0, s: 0.92 })}
          </div>
        )
      })}
    </div>
  )
}
