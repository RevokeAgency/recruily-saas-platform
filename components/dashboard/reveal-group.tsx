"use client"

import { useReveal } from "@/lib/hooks/useReveal"

/**
 * Client wrapper that drives the landing's scroll-reveal system inside the
 * dashboard: it observes `.reveal` descendants and toggles `.in` when they
 * enter the viewport (lib/hooks/useReveal). Stagger is CSS-driven via `.s1`–`.s5`.
 */
export function RevealGroup({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const ref = useReveal()
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
