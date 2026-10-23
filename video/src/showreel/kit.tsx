import React from "react"
import { AbsoluteFill, Img, staticFile, useVideoConfig } from "remotion"

import { theme } from "../config/theme"
import { mix, progress, springAt, useClock } from "../lib/time"
import meta from "../../public/showreel/showreel.json"

export { meta }

/** Format aus dem Seitenverhältnis: v = 9:16, s = 1:1, h = 16:9. Eine Zeitachse für alle. */
export type Fmt = "v" | "s" | "h"

export function useFmt(): { fmt: Fmt; W: number; H: number } {
  const { width: W, height: H } = useVideoConfig()
  const r = W / H
  return { fmt: r < 0.8 ? "v" : r > 1.3 ? "h" : "s", W, H }
}

export function pick<T>(fmt: Fmt, v: { v: T; s: T; h: T }): T {
  return v[fmt]
}

/** Abklingendes Wackeln nach einem Aufschlag (px). */
export function shake(t: number, at: number, amp: number, decay = 9): { x: number; y: number } {
  if (t < at) return { x: 0, y: 0 }
  const d = t - at
  const e = Math.exp(-d * decay) * amp
  return { x: Math.sin(d * 71) * e, y: Math.cos(d * 53) * e }
}

/** Summe mehrerer Aufschläge. */
export function shakes(t: number, hits: number[], amp: number): { x: number; y: number } {
  return hits.reduce(
    (acc, at) => {
      const s = shake(t, at, amp)
      return { x: acc.x + s.x, y: acc.y + s.y }
    },
    { x: 0, y: 0 },
  )
}

/** Bild aus public/showreel in CSS-Pixeln der Website, hochauflösend (2x) aufgenommen. */
export const Shot: React.FC<{ src: string; w: number; h: number; style?: React.CSSProperties }> = ({ src, w, h, style }) => (
  <Img src={staticFile(`showreel/${src}`)} style={{ position: "absolute", width: w, height: h, maxWidth: "none", ...style }} />
)

/** Bühne: Tinte der Website, zwei langsam wandernde Lichter im Markenverlauf, feine Ringe. */
export const Stage: React.FC<{ energy?: number }> = ({ energy = 1 }) => {
  const { t } = useClock()
  const { W, H } = useFmt()
  const blob = (cx: number, cy: number, r: number, color: string, a: number) => (
    <div
      style={{
        position: "absolute",
        left: cx - r,
        top: cy - r,
        width: r * 2,
        height: r * 2,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${color} 0%, rgba(0,0,0,0) 68%)`,
        opacity: a * energy,
      }}
    />
  )
  const R = Math.max(W, H)
  return (
    <AbsoluteFill style={{ background: "#0C1A16", overflow: "hidden" }}>
      {blob(W * (0.2 + 0.12 * Math.sin(t * 0.7)), H * (0.25 + 0.1 * Math.cos(t * 0.5)), R * 0.55, "rgba(34,193,238,0.55)", 0.55)}
      {blob(W * (0.85 - 0.1 * Math.sin(t * 0.6)), H * (0.8 + 0.08 * Math.sin(t * 0.9)), R * 0.6, "rgba(22,199,124,0.5)", 0.5)}
      <AbsoluteFill
        style={{
          backgroundImage: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.05) 1.5px, transparent 1.6px)",
          backgroundSize: "36px 36px",
          backgroundPosition: `${(t * 14) % 36}px ${(t * 9) % 36}px`,
          opacity: 0.7,
        }}
      />
    </AbsoluteFill>
  )
}

/** Korn und Vignette über allem. */
export const Finish: React.FC = () => {
  const { t, fps } = useClock()
  const seed = Math.floor(t * fps) % 8
  return (
    <>
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)",
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill style={{ opacity: 0.06, mixBlendMode: "overlay" }}>
        <svg width="100%" height="100%">
          <filter id={`sr-grain-${seed}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed} />
          </filter>
          <rect width="100%" height="100%" filter={`url(#sr-grain-${seed})`} />
        </svg>
      </AbsoluteFill>
    </>
  )
}

/**
 * Lichtschnitt im Markenverlauf: ein schräges Band fegt über den Szenenwechsel.
 * `at` = Mitte des Bands über der Bildmitte (Zeitpunkt des Schnitts).
 */
export const LightCut: React.FC<{ at: number; dir?: 1 | -1 }> = ({ at, dir = 1 }) => {
  const { t } = useClock()
  const { W, H } = useFmt()
  const span = 0.36
  if (t < at - span || t > at + span) return null
  const p = progress(t, at - span, at + span, theme.ease.inOut)
  const D = Math.hypot(W, H)
  const x = mix(p, -D, D) * dir
  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: W / 2 - D / 2 + x,
          top: H / 2 - D,
          width: D * 0.55,
          height: D * 2,
          transform: "rotate(18deg)",
          background: "linear-gradient(90deg, rgba(34,193,238,0) 0%, #22C1EE 30%, #E9FFF6 50%, #16C77C 70%, rgba(22,199,124,0) 100%)",
          filter: "blur(18px)",
          opacity: 0.95,
        }}
      />
    </AbsoluteFill>
  )
}

/** Kurzer heller Blitz auf einem Aufschlag. */
export const Flash: React.FC<{ at: number; strength?: number; color?: string }> = ({ at, strength = 0.55, color = "#E9FFF6" }) => {
  const { t } = useClock()
  if (t < at || t > at + 0.3) return null
  const o = (1 - progress(t, at, at + 0.3, theme.ease.out)) * strength
  return <AbsoluteFill style={{ background: color, opacity: o, mixBlendMode: "screen", pointerEvents: "none" }} />
}

/**
 * Bildunterschrift eines Features: Wörter kommen auf Achteln, mit Schlag
 * von unten; das letzte Wort trägt den Markenverlauf.
 */
export const Caption: React.FC<{ text: string; at: number; out: number; size: number; align?: "left" | "center"; width?: number }> = ({
  text,
  at,
  out,
  size,
  align = "center",
  width,
}) => {
  const { t, fps } = useClock()
  const words = text.split(" ")
  const pout = progress(t, out - 0.25, out, theme.ease.in)
  return (
    <div
      style={{
        width,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: align === "center" ? "center" : "flex-start",
        columnGap: size * 0.26,
        fontFamily: theme.font.display,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.02,
        letterSpacing: "-0.045em",
        color: "#F4FBF8",
        opacity: 1 - pout,
        transform: `translateY(${-pout * 30}px)`,
      }}
    >
      {words.map((w, i) => {
        const p = springAt(t, at + i * 0.25 * 0.5, fps, theme.spring.snappy)
        const last = i === words.length - 1
        return (
          <span key={i} style={{ display: "inline-block", overflow: "hidden", paddingBottom: size * 0.12, marginBottom: -size * 0.12 }}>
            <span
              style={{
                display: "inline-block",
                transform: `translateY(${mix(Math.min(1, p), size * 1.1, 0)}px) rotate(${mix(Math.min(1, p), 8, 0)}deg)`,
                transformOrigin: "0 100%",
                ...(last
                  ? { backgroundImage: theme.color.gradient, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }
                  : {}),
              }}
            >
              {w}
            </span>
          </span>
        )
      })}
    </div>
  )
}

/** Weicher Schatten für helle Website-Karten auf der dunklen Bühne. */
export const CARD_SHADOW = "0 50px 120px -30px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.08)"

/** Leuchtring, der sich von einem Punkt ausbreitet (Klick, Puls). */
export const Ripple: React.FC<{ x: number; y: number; at: number; size?: number; color?: string }> = ({ x, y, at, size = 120, color = "#22C1EE" }) => {
  const { t } = useClock()
  if (t < at || t > at + 0.6) return null
  const p = progress(t, at, at + 0.6, theme.ease.out)
  const r = mix(p, size * 0.2, size)
  return (
    <div
      style={{
        position: "absolute",
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: "50%",
        border: `${mix(p, 6, 1)}px solid ${color}`,
        opacity: 1 - p,
        boxShadow: `0 0 30px ${color}`,
        pointerEvents: "none",
      }}
    />
  )
}
