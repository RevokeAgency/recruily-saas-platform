import React from "react"
import { AbsoluteFill } from "remotion"

import { DEMO_COPY } from "../../config/copy"
import { DEMO_CUES, HANDOFF, SCENE, sat } from "../../config/demo-timing"
import { theme } from "../../config/theme"
import { mix, progress, useClock, within } from "../../lib/time"
import { RevetlyLogo } from "../brand/RevetlyLogo"
import { KineticText } from "../motion/KineticText"

/**
 * SZENE 1 — Intro. „Recruiting is time-consuming." schlägt als Headline-Slam
 * ein (HyperFrames-Overlay), dann „Meet" und das Logo, das sich aufbaut und
 * leuchtet. Am Ende fliegt die Kamera hindurch in Szene 2.
 */
export const IntroScene: React.FC = () => {
  const { t } = useClock()
  if (!within(t, SCENE.intro, SCENE.upload + 0.05)) return null
  const C = DEMO_CUES.intro

  // Kamera fliegt hindurch: skalieren, unscharf werden, ausblenden
  const out = progress(t, SCENE.upload - HANDOFF, SCENE.upload, theme.ease.in)
  const push = mix(progress(t, SCENE.intro, SCENE.upload, theme.ease.inOut), 1, 1.06)

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        opacity: 1 - out,
        transform: `scale(${push * mix(out, 1, 1.35)})`,
        filter: out > 0.01 ? `blur(${out * 10}px)` : undefined,
      }}
    >
      {/* „Recruiting is time-consuming." kommt als Headline-Slam aus dem
          HyperFrames-Overlay (hyperframes/compositions/intro.html). */}

      <div style={{ position: "absolute", display: "flex", alignItems: "center", gap: 44 }}>
        <KineticText text={DEMO_COPY.intro2} start={sat("intro", C.meet)} size={120} />
        <div style={{ width: 600, height: 150, display: "flex", alignItems: "center" }}>
          <RevetlyLogo start={sat("intro", C.logo)} width={600} />
        </div>
      </div>
    </AbsoluteFill>
  )
}
