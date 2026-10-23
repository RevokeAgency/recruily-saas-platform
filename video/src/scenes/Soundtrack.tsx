import React from "react"
import { Audio, interpolate, staticFile, useVideoConfig } from "remotion"

import { DURATION, MUSIC } from "../config/timeline"

/** Musik-Slot. Leer, solange in config/timeline.ts keine Datei eingetragen ist. */
export const Soundtrack: React.FC = () => {
  const { fps } = useVideoConfig()
  if (!MUSIC.src) return null

  const total = DURATION * fps
  return (
    <Audio
      src={staticFile(MUSIC.src)}
      trimBefore={Math.round(MUSIC.trimStart * fps)}
      volume={(f) =>
        MUSIC.volume *
        interpolate(f, [0, MUSIC.fadeIn * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) *
        interpolate(f, [total - MUSIC.fadeOut * fps, total], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
      }
    />
  )
}
