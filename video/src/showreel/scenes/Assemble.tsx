import React from "react"
import { AbsoluteFill } from "remotion"

import { theme } from "../../config/theme"
import { mix, progress, springAt, useClock } from "../../lib/time"
import { CARD_SHADOW, meta, pick, shakes, Shot, useFmt } from "../kit"
import { ASSEMBLY, ASSEMBLY_PUSH, SCENE } from "../timing"

const HERO = meta.hero
type Piece = { x: number; y: number; w: number; h: number }

/**
 * Beat 2: Der erste Bildschirm der Website setzt sich zusammen. Basis ist die
 * echte Aufnahme, stark unscharf; die echten Bauteile (aus derselben Aufnahme
 * geschnitten) fliegen auf Achteln an ihre Stelle. Danach wird die Basis scharf,
 * und die Kamera fährt an Headline und Button.
 */
export const Assemble: React.FC = () => {
  const { t, fps } = useClock()
  const { fmt, W, H } = useFmt()
  const { from, to } = SCENE.assemble

  const cam = pick(fmt, {
    v: { s0: 1.0, s1: 1.5, fx0: 560, fx: 500, fy: 420 },
    s: { s0: 0.69, s1: 1.4, fx0: HERO.w / 2, fx: 510, fy: 420 },
    h: { s0: 1.1, s1: 1.6, fx0: HERO.w / 2, fx: 520, fy: 420 },
  })
  const push = progress(t, ASSEMBLY_PUSH.from, ASSEMBLY_PUSH.to, theme.ease.inOut)
  const enterP = springAt(t, from, fps, theme.spring.smooth)
  const s = mix(push, cam.s0, cam.s1) * mix(Math.min(1, enterP), 0.55, 1)
  // Bildmitte des Panels wandert von der Panelmitte zum Fokuspunkt
  const fx = mix(push, cam.fx0, cam.fx)
  const fy = mix(push, HERO.h / 2, cam.fy)
  const rotX = mix(Math.min(1, enterP), 28, 0) + mix(push, 0, 4)
  const rotY = mix(Math.min(1, enterP), -22, 0) + mix(push, 0, -7)
  const outP = progress(t, to - 0.3, to, theme.ease.in)

  // Basis: unscharf und dunkel, bis das letzte Bauteil sitzt
  const last = ASSEMBLY[ASSEMBLY.length - 1].at
  const sharp = progress(t, last + 0.1, last + 0.6, theme.ease.out)
  const hits = ASSEMBLY.map((a) => a.at + 0.12)
  const cs = shakes(t, hits, 5)

  const transform = `translate(${W / 2 - fx + cs.x}px, ${H / 2 - fy + cs.y}px) perspective(2600px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${s})`

  return (
    <AbsoluteFill style={{ opacity: 1 - outP, filter: outP > 0 ? `blur(${outP * 10}px)` : undefined }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: HERO.w, height: HERO.h, transformOrigin: `${fx}px ${fy}px`, transform }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 22,
            overflow: "hidden",
            boxShadow: CARD_SHADOW,
            opacity: Math.min(1, enterP * 1.5),
          }}
        >
          <Shot
            src="hero/base.jpg"
            w={HERO.w}
            h={HERO.h}
            style={{ filter: sharp < 1 ? `blur(${mix(sharp, 26, 0)}px) brightness(${mix(sharp, 0.5, 1)}) saturate(${mix(sharp, 1.4, 1)})` : undefined }}
          />
        </div>
        {ASSEMBLY.map(({ piece, at, from: [dx, dy, r] }) => {
          if (t < at - 0.02) return null
          const box = (HERO.pieces as Record<string, Piece>)[piece]
          const p = springAt(t, at, fps, { damping: 14, stiffness: 190, mass: 0.7 })
          const q = Math.min(1, p)
          // Kurzer Lichtrand beim Aufsetzen, damit jedes Teil als Teil lesbar ist
          const land = progress(t, at + 0.08, at + 0.5, theme.ease.out)
          const edge = land > 0 && land < 1 ? (1 - land) * (1 - sharp) : 0
          return (
            <div
              key={piece}
              style={{
                position: "absolute",
                left: box.x,
                top: box.y,
                width: box.w,
                height: box.h,
                opacity: Math.min(1, p * 2) * (1 - sharp),
                transform: `translate(${mix(p, dx, 0)}px, ${mix(p, dy, 0)}px) rotate(${mix(q, r, 0)}deg) scale(${mix(q, 1.25, 1)})`,
                filter: `blur(${mix(q, 10, 0)}px)`,
                boxShadow: edge > 0 ? `0 0 0 ${2 / s}px rgba(34,193,238,${edge}), 0 0 ${40 * edge}px rgba(34,193,238,${edge * 0.8})` : undefined,
                borderRadius: 6,
              }}
            >
              <Shot src={`hero/${piece}.png`} w={box.w} h={box.h} />
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}
