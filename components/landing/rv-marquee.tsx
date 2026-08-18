"use client"

import { useEffect, useRef } from "react"

const CLAIMS = [
  "Datenbank in Frankfurt",
  "KI-Auswertung bei Mistral, Frankreich",
  "Mailversand über Lettermint, EU",
  "Kein Training auf Bewerberdaten",
  "Automatische Löschung nach 180 Tagen",
  "Jeder Score mit Beleg",
  "Zweite Prüfung vor jedem Ergebnis",
  "EU AI Act berücksichtigt",
  "Made in Austria",
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

  const items = [...CLAIMS, ...CLAIMS]

  return (
    <section className="border-y border-[rgba(12,26,22,.10)] py-[46px]">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <p className="mb-7 text-center text-[.74rem] font-semibold tracking-[.14em] text-[var(--rv-muted)] uppercase">
          Bewerberdaten, die Europa nicht verlassen
        </p>
      </div>
      <div className="rv-marquee">
        <div ref={trackRef} className="rv-marquee-track">
          {items.map((claim, i) => (
            <span
              key={i}
              className="flex items-center gap-3 text-[1rem] font-semibold tracking-[-0.015em] whitespace-nowrap text-[var(--rv-ink)] opacity-[.55]"
            >
              <span className="h-1.5 w-1.5 flex-none rounded-full bg-[image:var(--rv-gradient)]" />
              {claim}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
