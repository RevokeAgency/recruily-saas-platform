import React from "react"

import { theme } from "../../config/theme"
import { STAGGER } from "../../config/timing"
import { EXIT, mix, progress, springAt, useClock } from "../../lib/time"

/**
 * Kinetischer Text: Wörter klappen einzeln aus der Tiefe nach oben
 * (rotateX + translateY + Deckkraft + Unschärfe, per spring) und kippen beim
 * Abgang schneller nach oben weg (interpolate mit Easing).
 */
export const KineticText: React.FC<{
  text: string
  start: number
  end?: number
  size: number
  weight?: number
  color?: string
  align?: "left" | "center"
  maxW?: number
  /** Stil pro Wort, z. B. Verlauf für ein Schlüsselwort */
  wordStyle?: (word: string, i: number) => React.CSSProperties | undefined
  letterSpacing?: string
}> = ({ text, start, end, size, weight = 800, color = theme.color.text, align = "left", maxW, wordStyle, letterSpacing = "-0.04em" }) => {
  const { t, fps } = useClock()
  if (t < start - 0.01) return null
  if (end !== undefined && t >= end) return null
  const words = text.split(" ")
  return (
    <div
      style={{
        fontFamily: theme.font.display,
        fontSize: size,
        fontWeight: weight,
        letterSpacing,
        lineHeight: 1.05,
        color,
        textAlign: align,
        maxWidth: maxW,
        textWrap: "balance",
        perspective: size * 12,
      }}
    >
      {words.map((w, i) => {
        const p = springAt(t, start + i * STAGGER, fps, { damping: 18, stiffness: 140, mass: 0.8 })
        const out = end === undefined ? 0 : progress(t, end - EXIT - (words.length - 1 - i) * 0.03, end, theme.ease.in)
        const pin = Math.min(1, p)
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              marginRight: i < words.length - 1 ? "0.24em" : 0,
              transformOrigin: "50% 100%",
              opacity: pin * (1 - out),
              transform: `translateY(${mix(p, size * 0.5, 0) + mix(out, 0, -size * 0.35)}px) rotateX(${mix(p, 75, 0) + mix(out, 0, -60)}deg)`,
              filter: pin < 0.98 || out > 0.02 ? `blur(${mix(pin, 10, 0) + out * 6}px)` : undefined,
              ...wordStyle?.(w, i),
            }}
          >
            {w}
          </span>
        )
      })}
    </div>
  )
}
