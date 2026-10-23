import React from "react"

import { theme } from "../config/theme"

/**
 * Avatar-Fallback wie in der App: Initialen auf dem Markenverlauf
 * (candidates-tab.tsx, top-candidates.tsx). Keine Fotos.
 */
export const Avatar: React.FC<{ initials: string; size: number }> = ({ initials, size }) => (
  <div
    style={{
      width: size,
      height: size,
      flex: "none",
      borderRadius: "50%",
      backgroundImage: theme.color.gradient,
      color: "#0C1A16",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: theme.font.display,
      fontWeight: 650,
      fontSize: size * 0.36,
      letterSpacing: "0.01em",
    }}
  >
    {initials}
  </div>
)
