import React from "react"
import { AbsoluteFill } from "remotion"

import { COPY } from "../config/copy"
import { useLayout } from "../config/layout"
import { theme } from "../config/theme"
import { at, CUES, sceneEnd } from "../config/timeline"
import { enterExit, mix, progress, useTime } from "../lib/time"

/**
 * Text auf Bild für die Szenen 1–6. Jeder Text erscheint Wort für Wort
 * (Deckkraft, Versatz, Unschärfe zusammen) und geht schneller, als er kam.
 * Alle Zeitpunkte kommen aus config/timeline.ts.
 */
export const Captions: React.FC = () => {
  const zStunden = at("zaehler", CUES.zaehler.stunden)

  return (
    <AbsoluteFill>
      <CaptionBox>
        {/* 1 */}
        <Line start={at("stapel", CUES.stapel.text)} end={sceneEnd("stapel")} text={COPY.stapel} />

        {/* 2a — 15 Minuten, Zahl zählt hoch */}
        <Line
          start={at("zaehler", CUES.zaehler.minuten)}
          end={zStunden}
          count={{ to: COPY.zaehlerMinuten.zahl, from: at("zaehler", CUES.zaehler.minuten) + 0.1, dur: 1.0 }}
          text={COPY.zaehlerMinuten.rest}
        />

        {/* 2b — 80 × 15 Minuten → 20 Stunden */}
        <Line
          start={zStunden}
          end={sceneEnd("zaehler")}
          eyebrow={COPY.zaehlerStunden.vorzeile}
          count={{ to: COPY.zaehlerStunden.zahl, from: zStunden + 0.35, dur: 0.9 }}
          text={COPY.zaehlerStunden.rest}
          textDelay={0.25}
        />

        {/* 3 */}
        <Line start={at("unschaerfe", CUES.unschaerfe.text)} end={sceneEnd("unschaerfe")} text={COPY.unschaerfe} />

        {/* 4 — „Revetly" im Markenverlauf */}
        <Line
          start={at("erfassen", CUES.erfassen.text)}
          end={sceneEnd("erfassen")}
          brand={COPY.erfassen.marke}
          text={COPY.erfassen.rest}
        />

        {/* 5 — drei Takte, die Zeilen bleiben stehen */}
        <Stack
          end={sceneEnd("rangfolge")}
          lines={[
            { text: COPY.rangfolge[0], start: at("rangfolge", CUES.rangfolge.text1) },
            { text: COPY.rangfolge[1], start: at("rangfolge", CUES.rangfolge.text2) },
            { text: COPY.rangfolge[2], start: at("rangfolge", CUES.rangfolge.text3) },
          ]}
        />

        {/* 6 */}
        <Line start={at("begruendung", CUES.begruendung.text)} end={sceneEnd("begruendung")} text={COPY.begruendung} />
      </CaptionBox>
    </AbsoluteFill>
  )
}

const CaptionBox: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const L = useLayout()
  const c = L.caption
  return (
    <div
      style={{
        position: "absolute",
        left: c.x,
        top: c.y,
        width: c.w,
        height: c.h,
      }}
    >
      {React.Children.map(children, (child) => (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: c.align === "center" ? "center" : "flex-start",
          }}
        >
          {child}
        </div>
      ))}
    </div>
  )
}

function useHeadlineStyle(): React.CSSProperties {
  const L = useLayout()
  return {
    fontFamily: theme.font.display,
    fontSize: L.caption.size,
    fontWeight: 800,
    letterSpacing: "-0.035em",
    lineHeight: 1.06,
    color: theme.color.ink,
  }
}

/** Wörter einzeln einblenden. */
const Words: React.FC<{ text: string; start: number; end: number; style?: React.CSSProperties }> = ({
  text,
  start,
  end,
  style,
}) => {
  const t = useTime()
  const L = useLayout()
  const words = text.split(" ")
  return (
    <>
      {words.map((w, i) => {
        const s = enterExit(t, start + i * 0.06, end, { rise: L.caption.size * 0.32 })
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              marginRight: i < words.length - 1 ? "0.24em" : 0,
              opacity: s.opacity,
              transform: `translateY(${s.y}px)`,
              filter: s.blur > 0.05 ? `blur(${s.blur}px)` : undefined,
              ...style,
            }}
          >
            {w}
          </span>
        )
      })}
    </>
  )
}

const Line: React.FC<{
  start: number
  end: number
  text: string
  eyebrow?: string
  brand?: string
  count?: { to: number; from: number; dur: number }
  textDelay?: number
}> = ({ start, end, text, eyebrow, brand, count, textDelay = 0 }) => {
  const t = useTime()
  const L = useLayout()
  const head = useHeadlineStyle()
  if (t < start - 0.01 || t > end + 0.01) return null

  const offset = (brand ? 1 : 0) * 0.06 + (count ? 0.12 : 0) + textDelay
  const eb = enterExit(t, start, end, { rise: 14 })
  const num = count ? enterExit(t, start, end, { rise: L.caption.size * 0.32 }) : null
  const n = count ? Math.round(progress(t, count.from, count.from + count.dur) * count.to) : 0

  return (
    <div style={head}>
      {eyebrow && (
        <div
          style={{
            fontFamily: theme.font.support,
            fontSize: L.caption.eyebrow,
            fontWeight: 600,
            letterSpacing: "0.01em",
            color: theme.color.teal,
            marginBottom: L.caption.size * 0.28,
            opacity: eb.opacity,
            transform: `translateY(${eb.y}px)`,
          }}
        >
          {eyebrow}
        </div>
      )}
      <div>
        {count && num && (
          <span
            style={{
              display: "inline-block",
              marginRight: "0.24em",
              fontVariantNumeric: "tabular-nums",
              opacity: num.opacity,
              transform: `translateY(${num.y}px)`,
              filter: num.blur > 0.05 ? `blur(${num.blur}px)` : undefined,
            }}
          >
            {n}
          </span>
        )}
        {brand && (
          <Words
            text={brand}
            start={start}
            end={end}
            style={{
              backgroundImage: theme.color.gradient,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              // Unterlänge des „y" nicht abschneiden
              paddingBottom: "0.08em",
              marginBottom: "-0.08em",
            }}
          />
        )}
        {brand && <span style={{ display: "inline-block", width: "0.24em" }} />}
        <Words text={text} start={start + offset} end={end} />
      </div>
    </div>
  )
}

/** Mehrere Zeilen, die nacheinander dazukommen und gemeinsam gehen. */
const Stack: React.FC<{ end: number; lines: { text: string; start: number }[] }> = ({ end, lines }) => {
  const t = useTime()
  const head = useHeadlineStyle()
  if (t < lines[0].start - 0.01 || t > end + 0.01) return null
  return (
    <div style={head}>
      {lines.map((l, i) => {
        // ältere Zeilen treten leicht zurück, die neueste trägt
        const newer = lines.slice(i + 1).reduce((acc, n) => Math.max(acc, progress(t, n.start, n.start + 0.5)), 0)
        return (
          <div key={i} style={{ opacity: mix(newer, 1, 0.38) }}>
            <Words text={l.text} start={l.start} end={end} />
          </div>
        )
      })}
    </div>
  )
}
