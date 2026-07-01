"use client"

import { useEffect, useRef, useState } from "react"

import { useCountUp } from "@/lib/hooks/useCountUp"

interface CountUpProps {
  value: number
  suffix?: string
  duration?: number
  className?: string
}

/**
 * Animated number that counts up once it scrolls into view — the same
 * mechanic the Revetly landing uses on its stat blocks (lib/hooks/useCountUp).
 * Respects prefers-reduced-motion by rendering the final value immediately.
 */
export function CountUp({ value, suffix = "", duration = 1400, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [active, setActive] = useState(false)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setActive(true)
          observer.disconnect()
        }
      },
      { threshold: 0.4 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const animated = useCountUp(value, active && !reduced, duration)
  const shown = reduced ? value : animated

  return (
    <span ref={ref} className={className}>
      {shown}
      {suffix}
    </span>
  )
}
