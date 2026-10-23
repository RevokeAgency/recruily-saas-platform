import React from "react"

/**
 * 3D-Ebene für UI-Elemente: perspective + rotateX/Y/Z, dazu ein feiner
 * Lichtschimmer, der mit der Neigung wandert. Alle Werte kommen von außen
 * (aus spring/interpolate), die Komponente selbst animiert nichts.
 */
export const Tilt3D: React.FC<{
  rotateX?: number
  rotateY?: number
  rotateZ?: number
  scale?: number
  x?: number
  y?: number
  perspective?: number
  /** Ursprung der Drehung, z. B. "50% 50%" */
  origin?: string
  /** Lichtschimmer auf der Oberfläche (0 = aus) */
  sheen?: number
  radius?: number
  style?: React.CSSProperties
  children: React.ReactNode
}> = ({ rotateX = 0, rotateY = 0, rotateZ = 0, scale = 1, x = 0, y = 0, perspective = 2200, origin = "50% 50%", sheen = 0, radius = 28, style, children }) => {
  // Lichtkante: wandert gegen die Drehrichtung
  const sheenX = 50 - rotateY * 2.2
  const sheenY = 30 - rotateX * 1.6
  return (
    <div style={{ perspective, perspectiveOrigin: "50% 40%", ...style }}>
      <div
        style={{
          position: "relative",
          transformStyle: "preserve-3d",
          transformOrigin: origin,
          transform: `translate(${x}px, ${y}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale(${scale})`,
        }}
      >
        {children}
        {sheen > 0.001 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: radius,
              pointerEvents: "none",
              background: `radial-gradient(120% 80% at ${sheenX}% ${sheenY}%, rgba(255,255,255,${0.22 * sheen}) 0%, rgba(255,255,255,0) 55%)`,
              mixBlendMode: "screen",
            }}
          />
        )}
      </div>
    </div>
  )
}
