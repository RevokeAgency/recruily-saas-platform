"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export interface RvCardProps extends React.ComponentProps<"div"> {
  /** 3D pointer-tilt (index.html's perspective(720px) rotateX/rotateY spring). */
  tilt?: boolean
  /** Cursor-tracking radial glow. */
  spotlight?: boolean
}

// Feder wie zuvor mit framer-motion (stiffness 180, damping 18, mass 0.4),
// jetzt als kleine eigene Schleife. framer-motion war nur für diese Karte im
// Bundle der Landing und kostete dort rund 75 KB (gzip).
const SPRING = { stiffness: 180, damping: 18, mass: 0.4 }
const PERSPECTIVE = "perspective(720px)"

type Tilt = { x: number; y: number; vx: number; vy: number; tx: number; ty: number; raf: number; last: number }

/** Ein Schritt der Feder; plant sich selbst neu, bis die Karte ruht. */
function stepTilt(s: Tilt, el: HTMLDivElement | null, now: number) {
  const dt = Math.min((now - (s.last || now)) / 1000, 1 / 30) || 1 / 60
  s.last = now
  const ax = (-SPRING.stiffness * (s.x - s.tx) - SPRING.damping * s.vx) / SPRING.mass
  const ay = (-SPRING.stiffness * (s.y - s.ty) - SPRING.damping * s.vy) / SPRING.mass
  s.vx += ax * dt
  s.vy += ay * dt
  s.x += s.vx * dt
  s.y += s.vy * dt

  const resting =
    Math.abs(s.x - s.tx) < 0.0005 && Math.abs(s.y - s.ty) < 0.0005 && Math.abs(s.vx) < 0.001 && Math.abs(s.vy) < 0.001
  if (resting) {
    s.x = s.tx
    s.y = s.ty
    s.vx = s.vy = 0
    s.last = 0
  }
  if (el) {
    el.style.transform =
      s.x === 0 && s.y === 0
        ? PERSPECTIVE
        : `${PERSPECTIVE} rotateX(${(-s.y * 10).toFixed(2)}deg) rotateY(${(s.x * 10).toFixed(2)}deg)`
  }
  s.raf = resting ? 0 : requestAnimationFrame((t) => stepTilt(s, el, t))
}

/**
 * Shared card shell for the bento/feature/pricing/stat cards on the Revetly
 * landing: border + var(--rv-radius-lg) + optional spotlight glow + optional
 * pointer tilt. Desktop-only (hover:hover) per the reference's motion guards.
 */
function RvCard({ className, tilt = false, spotlight = false, children, style, onMouseMove, onMouseLeave, ...props }: RvCardProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  // x/y: aktuelle Auslenkung, v: Geschwindigkeit, t: Ziel (je -0.5 bis 0.5).
  const state = React.useRef<Tilt>({ x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, raf: 0, last: 0 })

  React.useEffect(() => {
    const s = state.current
    return () => cancelAnimationFrame(s.raf)
  }, [])

  const aim = (x: number, y: number) => {
    const s = state.current
    s.tx = x
    s.ty = y
    if (!s.raf) s.raf = requestAnimationFrame((t) => stepTilt(s, ref.current, t))
  }

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    if (spotlight) {
      el.style.setProperty("--sx", `${((e.clientX - r.left) / r.width) * 100}%`)
      el.style.setProperty("--sy", `${((e.clientY - r.top) / r.height) * 100}%`)
    }
    if (tilt) aim((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5)
    onMouseMove?.(e)
  }
  const handleLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (tilt) aim(0, 0)
    onMouseLeave?.(e)
  }

  return (
    <div
      ref={ref}
      data-slot="rv-card"
      className={cn(
        "border border-[rgba(12,26,22,.10)] bg-white transition-shadow duration-300",
        spotlight && "rv-spotlight",
        className,
      )}
      style={{
        borderRadius: "var(--rv-radius-lg)",
        ...(tilt ? { transform: PERSPECTIVE } : {}),
        ...style,
      }}
      onMouseMove={tilt || spotlight ? handleMove : onMouseMove}
      onMouseLeave={tilt ? handleLeave : onMouseLeave}
      {...props}
    >
      {children}
    </div>
  )
}

export { RvCard }
