import React from "react"
import { AbsoluteFill } from "remotion"

import { COPY } from "../config/copy"
import { useLayout } from "../config/layout"
import { glow, theme } from "../config/theme"
import { at, CUES } from "../config/timing"
import { mix, progress, useClock, within } from "../lib/time"
import { StageText } from "../ui/StageText"

/**
 * AKT 1 — HOOK. 0,5 s schwarz, dann die Frage Wort für Wort, zentriert.
 * Bei ~2,4 s zieht sich ein Cyan-Strich unter „wirklich", danach tritt der
 * Rest der Frage zurück. Harter Schnitt bei MARKERS.problem, kein Abgang.
 */
export const Act1Hook: React.FC = () => {
  const L = useLayout()
  const { t } = useClock()
  if (!within(t, at("hook"), at("problem"))) return null

  const lineP = progress(t, at("frage", CUES.frage.marker), at("frage", CUES.frage.marker + 0.45), theme.ease.inOut)
  const dim = progress(t, at("frage", CUES.frage.dimmen), at("frage", CUES.frage.dimmen + 0.5), theme.ease.inOut)
  // ganz langsames Hineinschieben über den ganzen Akt
  const push = mix(progress(t, at("frage"), at("problem"), theme.ease.inOut), 1, 1.045)

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ transform: `scale(${push})`, padding: `0 ${L.margin}px` }}>
        <StageText
          text={COPY.frage}
          start={at("frage")}
          size={L.hook.size}
          align="center"
          maxW={L.hook.maxW}
          lineHeight={1.08}
          wordStyle={(w) => {
            const betont = w === COPY.frageBetont || w.startsWith("gelesen")
            return { color: betont ? theme.color.text : `rgba(232,242,242,${mix(dim, 1, 0.4)})` }
          }}
          wordDecor={(w) =>
            w === COPY.frageBetont ? (
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: "-0.06em",
                  height: "0.07em",
                  borderRadius: 99,
                  background: theme.color.cyan,
                  boxShadow: glow(theme.color.cyan, lineP),
                  transformOrigin: "0 50%",
                  transform: `scaleX(${lineP})`,
                }}
              />
            ) : null
          }
        />
      </div>
    </AbsoluteFill>
  )
}
