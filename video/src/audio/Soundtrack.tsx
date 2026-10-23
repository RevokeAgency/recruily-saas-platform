import React from "react"
import { Audio, interpolate, Sequence, staticFile, useVideoConfig } from "remotion"

import { DURATION, MUSIC, SFX_LEAD, sfxCues } from "../config/timing"

/** Musik (Slot) und alle Soundeffekte aus config/timing.ts. */
export const Soundtrack: React.FC = () => {
  const { fps } = useVideoConfig()
  const total = DURATION * fps
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const

  return (
    <>
      {MUSIC.src && (
        <Audio
          src={staticFile(MUSIC.src)}
          trimBefore={Math.round(MUSIC.trimStart * fps)}
          volume={(f) =>
            MUSIC.volume *
            interpolate(f, [0, MUSIC.fadeIn * fps], [0, 1], clamp) *
            interpolate(f, [total - MUSIC.fadeOut * fps, total], [1, 0], clamp)
          }
        />
      )}
      {sfxCues().map((c, i) => (
        <Sequence key={i} from={Math.max(0, Math.round((c.at - SFX_LEAD) * fps))} durationInFrames={Math.round(2 * fps)} layout="none">
          <Audio src={staticFile(`sfx/${c.sound}.wav`)} volume={c.volume} />
        </Sequence>
      ))}
    </>
  )
}
