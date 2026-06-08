"use client"

import { useEffect, useRef, useState } from "react"

const STATS = [
  { value: 73, suffix: "%", label: "Less time on CV screening" },
  { value: 6, suffix: "x", label: "Faster time-to-interview" },
  { value: 5, suffix: " min", label: "Setup per job posting" },
  { value: 100, suffix: "%", label: "DSGVO compliant" },
]

function useCountUp(target: number, duration = 1500, active = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!active) return
    let start = 0
    const step = (timestamp: number) => {
      if (!start) start = timestamp
      const progress = Math.min((timestamp - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * target))
      if (progress < 1) requestAnimationFrame(step)
      else setCount(target)
    }
    requestAnimationFrame(step)
  }, [active, target, duration])
  return count
}

function StatItem({ value, suffix, label, active }: { value: number; suffix: string; label: string; active: boolean }) {
  const count = useCountUp(value, 1500, active)
  return (
    <div style={{ textAlign: "center", padding: "0 32px", flex: 1 }}>
      <div style={{ fontFamily: "var(--font-syne)", fontSize: "clamp(36px,4vw,52px)", fontWeight: 700, color: "#1DB954", lineHeight: 1 }}>
        {count}{suffix}
      </div>
      <div style={{ fontFamily: "var(--font-dm-sans)", fontSize: 15, color: "#4A4A4A", marginTop: 8, lineHeight: 1.4 }}>{label}</div>
    </div>
  )
}

export function StatsBar() {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setActive(true); observer.disconnect() }
    }, { threshold: 0.3 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={ref} style={{ background: "#F0FAF4", borderTop: "1px solid #C8EDD8", borderBottom: "1px solid #C8EDD8", padding: "52px 24px" }}>
      <div style={{ maxWidth: 1160, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 0 }}>
        {STATS.map((s, i) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", flex: "1 1 200px" }}>
            <StatItem {...s} active={active} />
            {i < STATS.length - 1 && (
              <div style={{ width: 1, height: 56, background: "#C8EDD8", flexShrink: 0 }} />
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
