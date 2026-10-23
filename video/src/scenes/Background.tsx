import React from "react"
import { AbsoluteFill } from "remotion"

import { theme } from "../config/theme"

/** Heller Grund mit einem Hauch Markenfarbe aus den oberen Ecken, wie die App. */
export const Background: React.FC = () => (
  <AbsoluteFill style={{ background: theme.color.paper }}>
    <AbsoluteFill style={{ backgroundImage: theme.color.paperTint }} />
  </AbsoluteFill>
)
