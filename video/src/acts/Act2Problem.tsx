import React from "react"
import { AbsoluteFill, random } from "remotion"

import { COPY } from "../config/copy"
import { useLayout } from "../config/layout"
import { glow, theme } from "../config/theme"
import { at, cardLandTime, CUES } from "../config/timing"
import { APPLICANTS } from "../data/mock"
import { breathe, enter, mix, progress, springAt, useClock, within } from "../lib/time"
import { ApplicationCard } from "../ui/ApplicationCard"
import { StageText } from "../ui/StageText"

const N = APPLICANTS.length
/** Diese Karten (die obersten) bleiben nach dem Zerfall liegen. */
const KEEP = [N - 3, N - 2, N - 1]

/**
 * AKT 2 — DAS PROBLEM
 *   problem     Karten fallen, Kamera schräg von oben, Zähler läuft auf 80
 *   rueckfahrt  Kamera fährt zurück, 80 × 15 Minuten → 20 Stunden
 *   zerfall     Stapel kippt und fällt auseinander, drei bleiben
 */
export const Act2Problem: React.FC = () => {
  const { t } = useClock()
  if (!within(t, at("problem"), at("scan"))) return null
  return (
    <AbsoluteFill>
      <Stack />
      <Counter />
      <AbsoluteFill style={{ alignItems: "center" }}>
        <ZerfallText />
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

const Stack: React.FC = () => {
  const L = useLayout()
  const { t, fps } = useClock()
  const P = L.problem

  // Kamera: schräg von oben, fährt in der Rückfahrt zurück, beim Zerfall in die Mitte
  const back = springAt(t, at("rueckfahrt"), fps, { damping: 26, stiffness: 40, mass: 1.2 })
  const fall = springAt(t, at("zerfall"), fps, { damping: 24, stiffness: 60, mass: 1 })
  const cx = mix(fall, mix(back, P.stack.x, P.stackBack.x), P.rest.x)
  const cy = mix(fall, mix(back, P.stack.y, P.stackBack.y), P.rest.y)
  const scale = mix(fall, mix(back, 1, P.stackBack.scale), L.format === "landscape" ? 0.72 : 0.62)
  const tiltX = mix(back, 26, 18) * (1 - fall) + 10 * fall
  // Stapel kippt
  const tip = springAt(t, at("zerfall", CUES.zerfall.kippen), fps, { damping: 14, stiffness: 90, mass: 1 })
  const settle = springAt(t, at("zerfall", CUES.zerfall.rest), fps, { damping: 20, stiffness: 110, mass: 0.8 })
  const rotZ = mix(tip, 0, -11) * (1 - settle)
  const b = breathe(t, 0.8)

  return (
    <div
      style={{
        position: "absolute",
        left: cx,
        top: cy,
        width: 0,
        height: 0,
        transform: `perspective(1900px) rotateX(${tiltX}deg) rotateZ(${rotZ}deg) scale(${scale * b.scale}) translateY(${b.y}px)`,
      }}
    >
      {APPLICANTS.map((a, i) => {
        const land = cardLandTime(i, N)
        const p = springAt(t, land - 0.2, fps, { damping: 19, stiffness: 260, mass: 0.6 })
        if (p <= 0) return null

        const jx = (random(`jx-${i}`) - 0.5) * 34
        const jy = (random(`jy-${i}`) - 0.5) * 22 - i * 0.9
        const jr = (random(`jr-${i}`) - 0.5) * 14

        // jede Karte kommt aus einer anderen Richtung von oben, nicht als Säule
        let x = mix(p, jx + (random(`fx-${i}`) - 0.5) * 900, jx)
        let y = mix(p, -700 - random(`fy-${i}`) * 300, jy)
        let rot = mix(p, jr + 18 * (random(`jd-${i}`) - 0.5), jr)
        let opacity = Math.min(1, p * 2.5)

        // Zerfall: alle bis auf die obersten drei rutschen aus dem Bild
        const keepIdx = KEEP.indexOf(i)
        if (keepIdx < 0) {
          const wave2 = i >= 52
          const s0 = wave2
            ? at("zerfall", CUES.zerfall.zweiteWelle + random(`w2-${i}`) * 0.45)
            : at("zerfall", 0.15 + random(`w1-${i}`) * 0.85)
          const s = progress(t, s0, s0 + 0.95, theme.ease.gravity)
          x += mix(s, 0, -(500 + random(`dx-${i}`) * 900))
          y += mix(s, 0, 1300 + random(`dy-${i}`) * 500)
          rot += mix(s, 0, -25 - random(`dr-${i}`) * 50)
          if (s >= 1) opacity = 0
        } else {
          // die drei verbleibenden fächern sich leicht auf
          const fan = settle
          x = mix(fan, x, (keepIdx - 1) * 250)
          y = mix(fan, y, Math.abs(keepIdx - 1) * 16)
          rot = mix(fan, rot, (keepIdx - 1) * 6)
        }

        return (
          <div
            key={a.id}
            style={{
              position: "absolute",
              left: x - L.card.w / 2,
              top: y - L.card.h / 2,
              transform: `rotate(${rot}deg) scale(${mix(Math.min(1, p), 1.08, 1)})`,
              opacity,
              zIndex: i,
            }}
          >
            <ApplicationCard applicant={a} w={L.card.w} h={L.card.h} />
          </div>
        )
      })}
    </div>
  )
}

/** Zähler: 0 → 80 Bewerbungen, dann 80 × 15 Minuten → 20 Stunden. */
const Counter: React.FC = () => {
  const L = useLayout()
  const { t, fps } = useClock()
  const P = L.problem
  const end = at("zerfall")
  if (t >= end) return null

  const landed = APPLICANTS.filter((_, i) => cardLandTime(i, N) <= t).length
  const first = enter(t, fps, cardLandTime(0, N), end, { rise: 40 })

  // Rückfahrt: Zähler wandert nach oben und wird zur Rechnung
  const move = springAt(t, at("rueckfahrt", CUES.rueckfahrt.rechnung), fps, { damping: 22, stiffness: 110, mass: 0.9 })
  const smallSize = P.big.size * 0.2
  const nSize = mix(move, P.counter.size, smallSize)
  const x = mix(move, P.counter.x, P.big.x)
  const y = mix(move, P.counter.y, P.big.y - P.big.size * 0.95)
  const swap = progress(t, at("rueckfahrt", 0.05), at("rueckfahrt", 0.4))

  return (
    <>
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          transform: `translateY(-100%) translateY(${first.y}px)`,
          opacity: first.opacity,
          filter: first.blur > 0.1 ? `blur(${first.blur}px)` : undefined,
          display: "flex",
          alignItems: "baseline",
          gap: nSize * 0.22,
          fontFamily: theme.font.display,
          color: theme.color.text,
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            fontSize: nSize,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
            minWidth: "1.25em",
            // Hero, solange der Zähler läuft
            textShadow: glow(theme.color.cyan, 1 - move),
          }}
        >
          {landed}
        </span>
        <span style={{ position: "relative", fontSize: nSize * 0.42, fontWeight: 700, letterSpacing: "-0.02em" }}>
          <span style={{ opacity: 1 - swap, display: "inline-block", transform: `translateY(${mix(swap, 0, -20)}px)` }}>
            {COPY.bewerbungen}
          </span>
          <span
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              opacity: swap,
              color: theme.color.textDim,
              fontSize: "1.9em",
              transform: `translateY(${mix(swap, 20, 0)}px) translateY(-28%)`,
            }}
          >
            {COPY.rechnung}
          </span>
        </span>
      </div>
      <Stunden />
    </>
  )
}

/** „20 Stunden." mit rollenden Ziffern, das größte Element im Bild. */
const Stunden: React.FC = () => {
  const L = useLayout()
  const { t, fps } = useClock()
  const P = L.problem
  const start = at("rueckfahrt", CUES.rueckfahrt.stunden)
  const end = at("zerfall")
  if (t < start - 0.05) return null

  const box = enter(t, fps, start, end, { rise: 50, config: theme.spring.smooth })
  const roll = springAt(t, start, fps, { damping: 22, stiffness: 120, mass: 1 })
  const word = enter(t, fps, at("rueckfahrt", CUES.rueckfahrt.stundenWort), end, { rise: 40 })
  const size = P.big.size
  const target = String(COPY.stunden.zahl).padStart(2, "0").split("").map(Number)
  const b = breathe(t, 0.6)

  // Rollenzählwerk: pro Stelle die aktuelle und die nächste Ziffer in einem
  // Fenster von genau einer Ziffernhöhe. Die Einerstelle dreht eine volle Runde.
  const digitH = size * 1.0
  const column = (digit: number, k: number) => {
    const turns = k === target.length - 1 ? 10 : 0
    const v = mix(roll, 0, digit + turns)
    const base = Math.floor(v)
    const frac = v - base
    const cell = (n: number, offset: number) => (
      <span
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: offset * digitH,
          height: digitH,
          lineHeight: `${digitH}px`,
          textAlign: "center",
        }}
      >
        {((n % 10) + 10) % 10}
      </span>
    )
    return (
      <span key={k} style={{ position: "relative", display: "inline-block", width: "0.62em", height: digitH, overflow: "hidden" }}>
        {cell(base, -frac)}
        {cell(base + 1, 1 - frac)}
      </span>
    )
  }

  return (
    <div
      style={{
        position: "absolute",
        left: P.big.x,
        top: P.big.y,
        transform: `translateY(-50%) translateY(${box.y + b.y}px) scale(${box.scale * b.scale})`,
        transformOrigin: "0 50%",
        opacity: box.opacity,
        display: "flex",
        alignItems: "flex-end",
        gap: size * 0.1,
        fontFamily: theme.font.display,
        color: theme.color.text,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          fontSize: size,
          fontWeight: 800,
          fontVariantNumeric: "tabular-nums",
          display: "inline-flex",
          // Glow außerhalb des Ziffernfensters, sonst schneidet der Clip ihn ab
          filter: `drop-shadow(0 0 22px rgba(34,193,238,0.55)) drop-shadow(0 0 60px rgba(34,193,238,0.3))`,
        }}
      >
        {target.map(column)}
      </span>
      <span
        style={{
          fontSize: size * 0.36,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          opacity: word.opacity,
          display: "inline-block",
          paddingBottom: size * 0.17,
          transform: `translateY(${word.y}px)`,
        }}
      >
        {COPY.stunden.wort}
      </span>
    </div>
  )
}

const ZerfallText: React.FC = () => {
  const L = useLayout()
  return (
    <div style={{ position: "absolute", top: L.problem.textY, width: L.problem.textW, display: "flex", justifyContent: "center" }}>
      <StageText
        text={COPY.zerfall}
        start={at("zerfall", CUES.zerfall.text)}
        end={at("scan")}
        size={L.problem.textSize}
        align="center"
        maxW={L.problem.textW}
      />
    </div>
  )
}
