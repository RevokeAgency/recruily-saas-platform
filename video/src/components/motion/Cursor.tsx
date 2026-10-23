import React from "react"

/** Mauszeiger (macOS-artig), `press` 0..1 drückt ihn leicht zusammen. */
export const Cursor: React.FC<{ x: number; y: number; press?: number; opacity?: number; size?: number }> = ({ x, y, press = 0, opacity = 1, size = 34 }) => (
  <svg
    width={size}
    height={size * 1.3}
    viewBox="0 0 24 31"
    style={{
      position: "absolute",
      left: x,
      top: y,
      opacity,
      transform: `scale(${1 - press * 0.12})`,
      transformOrigin: "0 0",
      filter: "drop-shadow(0 6px 10px rgba(0,0,0,.35))",
      zIndex: 100,
    }}
  >
    <path d="M2 2 L2 25 L8 19.5 L12.2 29 L16.4 27.2 L12.3 18 L20.5 18 Z" fill="#FFFFFF" stroke="#0C1A16" strokeWidth={1.6} strokeLinejoin="round" />
  </svg>
)
