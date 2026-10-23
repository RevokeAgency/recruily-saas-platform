import React from "react"
import { AbsoluteFill } from "remotion"

import { Cursor } from "../../components/motion/Cursor"
import { theme } from "../../config/theme"
import { mix, progress, springAt, useClock } from "../../lib/time"
import { Caption, CARD_SHADOW, meta, pick, Ripple, Shot, useFmt } from "../kit"
import { COMPARE, COPY, SCENE } from "../timing"

const C = meta.compare

/**
 * Feature 1: der Vorher/Nachher-Regler der Website. Beide Ebenen sind echte
 * Aufnahmen (Regler ganz rechts / ganz links), der Griff stammt aus der
 * Mittelstellung. Der Cursor greift ihn und zieht „Mit Revetly" auf.
 */
export const Compare: React.FC = () => {
  const { t, fps } = useClock()
  const { fmt, W } = useFmt()
  const { from, to } = SCENE.compare

  const L = pick(fmt, {
    v: { x0: 0, w: 600, k: 1.75, top: 700, cap: { top: 300, size: 118, width: 900 } },
    s: { x0: 0, w: 600, k: 1.55, top: 330, cap: { top: 110, size: 92, width: 980 } },
    h: { x0: 0, w: C.w, k: 1.5, top: 330, cap: { top: 120, size: 100, width: 1700 } },
  })
  const pw = L.w * L.k
  const ph = C.h * L.k
  const left = (W - pw) / 2

  // Teiler: Mitte → links, mit leichtem Überschwingen beim Loslassen
  const drag = progress(t, COMPARE.grab + 0.05, COMPARE.release, theme.ease.inOut)
  const ratio = mix(drag, COMPARE.fromRatio, COMPARE.toRatio)
  const D = ratio * C.w

  const enterP = springAt(t, from, fps, theme.spring.smooth)
  const q = Math.min(1, enterP)
  const outP = progress(t, to - 0.3, to, theme.ease.in)

  // Bildschirmkoordinaten eines Punkts auf dem Panel
  const sx = (x: number) => left + (x - L.x0) * L.k
  const sy = (y: number) => L.top + y * L.k

  // Cursor: von rechts unten an den Griff, ziehen, danach leicht weg
  const knob = { x: sx(D), y: sy(C.handle.knobY) }
  const arrive = progress(t, COMPARE.arrive - 0.35, COMPARE.grab - 0.05, theme.ease.out)
  const after = progress(t, COMPARE.release + 0.1, COMPARE.release + 0.6, theme.ease.inOut)
  const cx = t < COMPARE.grab ? mix(arrive, W + 80, knob.x) : knob.x + after * 120
  const cy = t < COMPARE.grab ? mix(arrive, sy(C.h) + 300, knob.y) : knob.y + after * 90
  const pressed = t >= COMPARE.grab - 0.04 && t < COMPARE.release ? 1 : 0

  // Erste Zeile des Rankings („92 %") in der Ebene „Mit Revetly"
  const top = { x: sx(497), y: sy(167) }

  return (
    <AbsoluteFill style={{ opacity: 1 - outP, transform: `scale(${mix(outP, 1, 1.15)})` }}>
      <div style={{ position: "absolute", top: L.cap.top, left: (W - L.cap.width) / 2, width: L.cap.width }}>
        <Caption text={COPY.captions.compare} at={from + 0.05} out={to} size={L.cap.size} />
      </div>
      <div
        style={{
          position: "absolute",
          left,
          top: L.top,
          width: pw,
          height: ph,
          transform: `perspective(2200px) rotateY(${mix(q, 34, 0)}deg) rotateX(${mix(q, 10, 0)}deg) translateY(${mix(q, 260, 0)}px) scale(${mix(q, 0.8, 1)})`,
          opacity: Math.min(1, enterP * 2),
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 30 * L.k,
            overflow: "hidden",
            boxShadow: CARD_SHADOW,
          }}
        >
          <div style={{ position: "absolute", left: -L.x0 * L.k, top: 0, width: C.w, height: C.h, transform: `scale(${L.k})`, transformOrigin: "0 0" }}>
            <div style={{ position: "absolute", inset: 0, clipPath: `inset(${C.inset}px round ${C.radius}px)` }}>
              <Shot src="compare/ohne.jpg" w={C.w} h={C.h} />
              <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 0 0 ${D}px)` }}>
                <Shot src="compare/mit.jpg" w={C.w} h={C.h} />
              </div>
              <Shot
                src="compare/handle.png"
                w={C.handle.w}
                h={C.h}
                style={{ left: D - (C.divider - C.handle.x0), top: 0, filter: "drop-shadow(0 4px 10px rgba(12,26,22,0.25))" }}
              />
            </div>
          </div>
        </div>
      </div>
      <Ripple x={knob.x} y={knob.y} at={COMPARE.grab} size={110} />
      <Ripple x={top.x} y={top.y} at={COMPARE.pulse} size={150} color="#16C77C" />
      {t >= COMPARE.arrive - 0.4 && <Cursor x={cx - 4} y={cy - 2} press={pressed} size={pick(fmt, { v: 58, s: 50, h: 50 })} />}
    </AbsoluteFill>
  )
}
