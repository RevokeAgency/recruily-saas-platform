"use client"

import { useEffect, useRef } from "react"

const LOGOS = [
  "Kiefer & Partner",
  "Metall Union",
  "Albrecht GmbH",
  "Nordlogistik AG",
  "Baugruppe Süd",
  "Häusler & Söhne",
  "Weidmann Technik",
  "Fendt Consult",
  "Ritter Medizin",
]

/**
 * Trusted-by marquee (index.html .marquee): speeds up and reverses
 * direction based on scroll velocity.
 */
export function RvMarquee() {
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    let vel = 1
    let prevY = window.scrollY
    let dir = 1

    const onScroll = () => {
      const dy = window.scrollY - prevY
      prevY = window.scrollY
      if (Math.abs(dy) > 1) {
        dir = dy > 0 ? 1 : -1
        vel = Math.min(3.5, 1 + Math.abs(dy) * 0.14)
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true })

    const interval = window.setInterval(() => {
      vel += (1 - vel) * 0.07
      const track = trackRef.current
      if (track) {
        track.style.animationDuration = `${26 / Math.max(0.4, vel)}s`
        track.style.animationDirection = dir > 0 ? "normal" : "reverse"
      }
    }, 50)

    return () => {
      window.removeEventListener("scroll", onScroll)
      window.clearInterval(interval)
    }
  }, [])

  const items = [...LOGOS, ...LOGOS]

  return (
    <section className="border-y border-[rgba(12,26,22,.10)] py-[46px]">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <p className="mb-7 text-center text-[.74rem] font-semibold tracking-[.14em] text-[var(--rv-muted)] uppercase">
          Vertraut von HR-Teams in der DACH-Region
        </p>
      </div>
      <div className="rv-marquee">
        <div ref={trackRef} className="rv-marquee-track">
          {items.map((logo, i) => (
            <span
              key={i}
              className="text-[1.26rem] font-extrabold tracking-[-0.03em] whitespace-nowrap text-[var(--rv-ink)] opacity-[.34] transition-opacity hover:opacity-80"
            >
              {logo}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
