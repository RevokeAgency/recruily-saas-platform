import React from "react"

import { theme } from "../config/theme"
import { STAGGER } from "../config/timing"
import { enter, useClock } from "../lib/time"

/**
 * Text auf der dunklen Bühne. Wörter kommen einzeln (Spring: Deckkraft,
 * Versatz, Maßstab, Unschärfe) und gehen gemeinsam, schneller als sie kamen.
 */
export const StageText: React.FC<{
  text: string
  start: number
  end?: number
  size: number
  weight?: number
  color?: string
  align?: "left" | "center"
  maxW?: number
  lineHeight?: number
  /** Stil pro Wort, z. B. für Hervorhebungen */
  wordStyle?: (word: string, index: number) => React.CSSProperties | undefined
  /** zusätzliches Element hinter einem Wort (z. B. Unterstrich) */
  wordDecor?: (word: string, index: number) => React.ReactNode
}> = ({ text, start, end, size, weight = 800, color = theme.color.text, align = "left", maxW, lineHeight = 1.06, wordStyle, wordDecor }) => {
  const { t, fps } = useClock()
  if (t < start) return null
  if (end !== undefined && t >= end) return null
  const words = text.split(" ")
  return (
    <div
      style={{
        fontFamily: theme.font.display,
        fontSize: size,
        fontWeight: weight,
        letterSpacing: "-0.035em",
        lineHeight,
        color,
        textAlign: align,
        maxWidth: maxW,
        // ausgewogene Zeilen, keine einzelnen Wörter in der letzten Zeile
        textWrap: "balance",
      }}
    >
      {words.map((w, i) => {
        const s = enter(t, fps, start + i * STAGGER, end, { rise: size * 0.35 })
        return (
          <span
            key={i}
            style={{
              position: "relative",
              display: "inline-block",
              marginRight: i < words.length - 1 ? "0.24em" : 0,
              opacity: s.opacity,
              transform: `translateY(${s.y}px) scale(${s.scale})`,
              filter: s.blur > 0.1 ? `blur(${s.blur}px)` : undefined,
              ...wordStyle?.(w, i),
            }}
          >
            {wordDecor?.(w, i)}
            {w}
          </span>
        )
      })}
    </div>
  )
}
