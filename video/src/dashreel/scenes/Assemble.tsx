import React from "react"
import { AbsoluteFill } from "remotion"

import { theme } from "../../config/theme"
import { mix, progress, springAt, useClock } from "../../lib/time"
import { CARD_SHADOW, pick, shakes, Shot, useFmt } from "../../showreel/kit"
import meta from "../../../public/showreel/dashboard/dashboard.json"
import { ASSEMBLY, ASSEMBLY_PUSH, SCENE } from "../timing"

const VP = meta.viewport
type Piece = { x: number; y: number; w: number; h: number }

/**
 * Beat 2: Der erste Bildschirm des Dashboards setzt sich zusammen. Basis ist die
 * echte Aufnahme, unscharf; Kopfzeile, Begrüßung, Kennzahlen, Status, Buttons und die
 * erste Kartenreihe (aus derselben Aufnahme geschnitten) fliegen an ihre Stelle.
 */
export const Assemble: React.FC = () => {
  const { t, fps } = useClock()
  const { fmt, W, H } = useFmt()
  const { from, to } = SCENE.assemble

  const cam = pick(fmt, {
    v: { s0: 0.74, s1: 1.45, fx: 500, fy: 380 },
    s: { s0: 0.72, s1: 1.25, fx: 560, fy: 380 },
    h: { s0: 1.1, s1: 1.55, fx: 600, fy: 360 },
  })
  const push = progress(t, ASSEMBLY_PUSH.from, ASSEMBLY_PUSH.to, theme.ease.inOut)
  const enterP = springAt(t, from, fps, theme.spring.smooth)
  const q = Math.min(1, enterP)
  const s = mix(push, cam.s0, cam.s1) * mix(q, 0.55, 1)
  const fx = mix(push, VP.w / 2, cam.fx)
  const fy = mix(push, VP.h / 2, cam.fy)
  const rotX = mix(q, 30, 0) + mix(push, 0, 5)
  const rotY = mix(q, 24, 0) + mix(push, 0, 8)
  const outP = progress(t, to - 0.3, to, theme.ease.in)

  const last = ASSEMBLY[ASSEMBLY.length - 1].at
  const sharp = progress(t, last + 0.12, last + 0.6, theme.ease.out)
  const cs = shakes(
    t,
    ASSEMBLY.map((a) => a.at + 0.12),
    5,
  )

  return (
    <AbsoluteFill style={{ opacity: 1 - outP, filter: outP > 0 ? `blur(${outP * 10}px)` : undefined }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: VP.w,
          height: VP.h,
          transformOrigin: `${fx}px ${fy}px`,
          transform: `translate(${W / 2 - fx + cs.x}px, ${H / 2 - fy + cs.y}px) perspective(2600px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${s})`,
        }}
      >
        <div style={{ position: "absolute", inset: 0, borderRadius: 26, overflow: "hidden", boxShadow: CARD_SHADOW, opacity: Math.min(1, enterP * 1.5) }}>
          <Shot
            src="dashboard/base.jpg"
            w={VP.w}
            h={VP.h}
            style={{ filter: sharp < 1 ? `blur(${mix(sharp, 24, 0)}px) brightness(${mix(sharp, 0.55, 1)}) saturate(${mix(sharp, 1.3, 1)})` : undefined }}
          />
        </div>
        {ASSEMBLY.map(({ piece, at, from: [dx, dy, r] }) => {
          if (t < at - 0.02) return null
          const box = (meta.pieces as Record<string, Piece>)[piece]
          const p = springAt(t, at, fps, { damping: 14, stiffness: 190, mass: 0.7 })
          const pq = Math.min(1, p)
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
                transform: `translate(${mix(p, dx, 0)}px, ${mix(p, dy, 0)}px) rotate(${mix(pq, r, 0)}deg) scale(${mix(pq, 1.25, 1)})`,
                filter: `blur(${mix(pq, 10, 0)}px)${edge > 0 ? ` drop-shadow(0 0 ${30 * edge}px rgba(34,193,238,${edge}))` : ""}`,
              }}
            >
              <Shot src={`dashboard/p-${piece}.png`} w={box.w} h={box.h} />
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}
