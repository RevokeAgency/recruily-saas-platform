"use client"

import * as React from "react"
import { motion, useMotionValue, useSpring, useTransform, type HTMLMotionProps } from "framer-motion"

import { cn } from "@/lib/utils"

export interface RvCardProps extends HTMLMotionProps<"div"> {
  /** 3D pointer-tilt (index.html's perspective(720px) rotateX/rotateY spring). */
  tilt?: boolean
  /** Cursor-tracking radial glow. */
  spotlight?: boolean
}

/**
 * Shared card shell for the bento/feature/pricing/stat cards on the Revetly
 * landing: border + var(--rv-radius-lg) + optional spotlight glow + optional
 * pointer tilt. Desktop-only (hover:hover) per the reference's motion guards.
 */
function RvCard({ className, tilt = false, spotlight = false, children, style, ...props }: RvCardProps) {
  const rx = useMotionValue(0)
  const ry = useMotionValue(0)
  const springRx = useSpring(rx, { stiffness: 180, damping: 18, mass: 0.4 })
  const springRy = useSpring(ry, { stiffness: 180, damping: 18, mass: 0.4 })
  const rotateX = useTransform(springRy, (v) => `${(-v * 10).toFixed(2)}deg`)
  const rotateY = useTransform(springRx, (v) => `${(v * 10).toFixed(2)}deg`)

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    if (spotlight) {
      el.style.setProperty("--sx", `${((e.clientX - r.left) / r.width) * 100}%`)
      el.style.setProperty("--sy", `${((e.clientY - r.top) / r.height) * 100}%`)
    }
    if (tilt) {
      rx.set((e.clientX - r.left) / r.width - 0.5)
      ry.set((e.clientY - r.top) / r.height - 0.5)
    }
  }
  const handleLeave = () => {
    if (tilt) {
      rx.set(0)
      ry.set(0)
    }
  }

  return (
    <motion.div
      data-slot="rv-card"
      className={cn(
        "border border-[rgba(12,26,22,.10)] bg-white transition-shadow duration-300",
        spotlight && "rv-spotlight",
        className,
      )}
      style={{
        borderRadius: "var(--rv-radius-lg)",
        ...(tilt ? { rotateX, rotateY, transformPerspective: 720 } : {}),
        ...style,
      }}
      onMouseMove={tilt || spotlight ? handleMove : undefined}
      onMouseLeave={tilt ? handleLeave : undefined}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export { RvCard }
