"use client"

import Link from "next/link"
import { useReveal } from "@/lib/hooks/useReveal"

export function FinalCTA() {
  const ref = useReveal()

  return (
    <section ref={ref} style={{ background: "#0D1F14", padding: "120px 24px", position: "relative", overflow: "hidden" }}>
      {/* Radial glow */}
      <div style={{
        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: 600, height: 400, borderRadius: "50%",
        background: "radial-gradient(ellipse at center, rgba(29,185,84,0.12) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div ref={ref} style={{ maxWidth: 720, margin: "0 auto", textAlign: "center", position: "relative" }}>
        <h2 className="reveal" style={{ fontFamily: "var(--font-fraunces)", fontSize: "clamp(36px,5vw,58px)", fontWeight: 700, color: "#FFFFFF", lineHeight: 1.15, marginBottom: 20 }}>
          Your next great hire<br />is already in your inbox.
        </h2>

        <p className="reveal" style={{ fontFamily: "var(--font-syne)", fontSize: "clamp(18px,2vw,24px)", fontWeight: 600, color: "#1DB954", marginBottom: 44 }}>
          REVETLY finds them for you.
        </p>

        <div className="reveal">
          <Link
            href="/auth"
            className="animate-pulse-glow"
            style={{
              display: "inline-block",
              fontFamily: "var(--font-dm-sans)",
              fontSize: 18,
              fontWeight: 700,
              color: "#FFFFFF",
              background: "#1DB954",
              padding: "18px 40px",
              borderRadius: 6,
              textDecoration: "none",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.background = "#158A3E"
              el.style.transform = "scale(1.03)"
              el.style.boxShadow = "0 12px 40px rgba(29,185,84,0.4)"
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.background = "#1DB954"
              el.style.transform = "scale(1)"
              el.style.boxShadow = ""
            }}
          >
            Start for Free — No Credit Card
          </Link>
        </div>

        <p className="reveal" style={{ fontFamily: "var(--font-dm-sans)", fontSize: 14, color: "#A8C4B0", marginTop: 20 }}>
          Setup in 5 minutes. First candidates in hours. Cancel anytime.
        </p>
      </div>
    </section>
  )
}
