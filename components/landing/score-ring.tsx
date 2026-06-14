"use client"

import { useEffect, useRef, useState } from "react"

interface ScoreRingProps {
  value: number // 0-100
  size?: number
  stroke?: number
  label?: string
  duration?: number
}

/**
 * Circular score ring that animates from 0 to `value` when it
 * scrolls into view.
 */
export function ScoreRing({
  value,
  size = 64,
  stroke = 6,
  label,
  duration = 1400,
}: ScoreRingProps) {
  const ref = useRef<SVGSVGElement>(null)
  const [progress, setProgress] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !started.current) {
            started.current = true
            const start = performance.now()
            const tick = (now: number) => {
              const p = Math.min((now - start) / duration, 1)
              const eased = 1 - Math.pow(1 - p, 3)
              setProgress(eased * value)
              if (p < 1) requestAnimationFrame(tick)
            }
            requestAnimationFrame(tick)
            observer.disconnect()
          }
        })
      },
      { threshold: 0.5 },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [value, duration])

  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg ref={ref} width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E9E7"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#4EB0BE"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute font-sans text-sm font-bold text-[#081314]">
        {Math.round(progress)}
        {label ?? "%"}
      </span>
    </div>
  )
}
