import React from "react"
import { AbsoluteFill } from "remotion"
import { FileUp, ListOrdered, Sparkles } from "lucide-react"

import { DEMO_COPY } from "../../config/copy"
import { DEMO_CUES, HANDOFF, SCENE, sat } from "../../config/demo-timing"
import { theme } from "../../config/theme"
import { STAGGER } from "../../config/timing"
import { DEMO_LIST } from "../../data/mock"
import { mix, progress, springAt, useClock, within } from "../../lib/time"
import { RevetlyLogo } from "../brand/RevetlyLogo"
import { KineticText } from "../motion/KineticText"
import { Tilt3D } from "../motion/Tilt3D"

const ICONS = [FileUp, ListOrdered, Sparkles]

/** Kleine Feature-Kachel im Stil der App-Karten. */
const FeatureTile: React.FC<{ k: number; label: string }> = ({ k, label }) => {
  const Icon = ICONS[k]
  return (
    <div className="w-[340px] rounded-[24px] bg-white p-6 shadow-[0_40px_80px_-24px_rgba(0,0,0,.7)]">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--app-green-wash)] text-[var(--rv-green-deep)]">
          <Icon className="h-5 w-5" strokeWidth={2} />
        </span>
        <span className="text-lg font-bold text-foreground">{label}</span>
      </div>
      <div className="mt-5 space-y-2.5">
        {k === 0 && (
          <div className="flex h-[92px] items-center justify-center rounded-xl border-2 border-dashed border-teal-400 bg-teal-50/60 text-sm font-semibold text-teal-700">
            CV hochladen
          </div>
        )}
        {k === 1 &&
          DEMO_LIST.slice(0, 3).map((c) => (
            <div key={c.name} className="flex items-center justify-between rounded-lg bg-[var(--muted)] px-3 py-2 text-sm">
              <span className="font-medium text-foreground">{c.name}</span>
              <span className="font-bold text-primary">{c.score}%</span>
            </div>
          ))}
        {k === 2 && (
          <>
            {[92, 80, 86, 60].map((w, i) => (
              <div key={i} className="h-2.5 rounded-full" style={{ width: `${w}%`, background: i === 1 ? "rgba(34,193,238,.35)" : "#EEF1F3" }} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

/**
 * SZENE 4 — Outro. Drei Feature-Kacheln schweben im Halbkreis herein und
 * laufen in der Mitte zusammen; daraus baut sich das Logo auf, darunter
 * Slogan und CTA. Logo und Hintergrund atmen bis zum Schluss.
 */
export const OutroScene: React.FC = () => {
  const { t, fps } = useClock()
  const S0 = SCENE.outro
  if (!within(t, S0 - HANDOFF, SCENE.ende + 1)) return null
  const C = DEMO_CUES.outro
  const at = (o: number) => sat("outro", o)

  const merge = progress(t, at(C.zusammen), at(C.zusammen + 0.55), theme.ease.in)
  const cta = springAt(t, at(C.cta), fps, theme.spring.logo)
  const shimmer = progress(t, at(C.schimmer), at(C.schimmer + 0.8), theme.ease.inOut)

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      {/* Feature-Kacheln */}
      {merge < 1 &&
        DEMO_COPY.features.map((label, k) => {
          const p = springAt(t, S0 - HANDOFF / 2 + k * STAGGER * 1.5, fps, theme.spring.smooth)
          const side = k - 1
          return (
            <div key={label} style={{ position: "absolute", left: 960 - 170 + mix(merge, side * 560, 0), top: 540 - 120 + mix(merge, Math.abs(side) * 40, 0) }}>
              <Tilt3D
                rotateY={mix(p, -side * 55, -side * 22) * (1 - merge)}
                rotateX={mix(p, 25, 8) + Math.sin(t * 0.8 + k) * 1.5}
                scale={mix(p, 0.75, 1.3) * mix(merge, 1, 0.25)}
                y={mix(p, 160, 0)}
                sheen={0.6}
                radius={24}
              >
                <div style={{ opacity: Math.min(1, p * 1.5) * (1 - merge), filter: merge > 0.01 ? `blur(${merge * 8}px)` : undefined }}>
                  <FeatureTile k={k} label={label} />
                </div>
              </Tilt3D>
            </div>
          )
        })}

      {/* Logo, Slogan, CTA */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", transform: "translateY(-30px)" }}>
        <RevetlyLogo start={at(C.logo)} width={760} />
        <div style={{ marginTop: 46 }}>
          <KineticText text={DEMO_COPY.slogan} start={at(C.slogan)} size={52} weight={700} align="center" color={theme.color.textDim} letterSpacing="-0.02em" />
        </div>
        <div
          style={{
            marginTop: 34,
            position: "relative",
            overflow: "hidden",
            borderRadius: 999,
            backgroundImage: theme.color.gradient,
            padding: "16px 40px",
            fontFamily: theme.font.display,
            fontSize: 34,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "#0C1A16",
            opacity: Math.min(1, cta * 1.5),
            transform: `scale(${mix(Math.min(cta, 1.15), 0.6, 1)}) translateY(${mix(Math.min(cta, 1), 30, 0)}px)`,
          }}
        >
          {DEMO_COPY.cta}
          {/* Lichtkante */}
          <span
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              width: 80,
              left: `${mix(shimmer, -30, 130)}%`,
              background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.65), rgba(255,255,255,0))",
              transform: "skewX(-20deg)",
              opacity: shimmer > 0 && shimmer < 1 ? 1 : 0,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  )
}
