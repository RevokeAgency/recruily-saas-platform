"use client"

import { useReveal } from "@/lib/hooks/useReveal"

const CARDS = [
  { stat: "40%", icon: "📥", title: "Lost in CVs", body: "Hours spent reading applications that were wrong for the role from the first line." },
  { stat: "6 weeks", icon: "⏳", title: "Candidates disappear", body: "Average time-to-hire in DACH. Your best candidate accepted another offer on week 2." },
  { stat: "3×", icon: "📞", title: "The same screening call", body: "Same questions. Every time. For every candidate. That's not recruiting. That's admin." },
]

export function ProblemSection() {
  const ref = useReveal()

  return (
    <section ref={ref} style={{ background: "#F8F7F4", padding: "96px 24px" }}>
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>
        {/* Label */}
        <div className="reveal" style={{ fontFamily: "var(--font-dm-sans)", fontSize: 13, color: "#1DB954", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, marginBottom: 20 }}>
          The Problem
        </div>

        {/* Headline */}
        <h2 className="reveal" style={{ fontFamily: "var(--font-syne)", fontSize: "clamp(30px,3.6vw,44px)", fontWeight: 700, color: "#0A0A0A", lineHeight: 1.2, maxWidth: 620, marginBottom: 20 }}>
          Recruiting is broken.<br />Not because of people.<br />Because of process.
        </h2>

        {/* Subline */}
        <p className="reveal" style={{ fontFamily: "var(--font-dm-sans)", fontSize: 18, color: "#4A4A4A", lineHeight: 1.7, maxWidth: 540, marginBottom: 56 }}>
          The average recruiter in DACH spends 40% of their time on admin. Not hiring. Admin.
        </p>

        {/* Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, marginBottom: 32 }}>
          {CARDS.map((c, i) => (
            <div
              key={c.title}
              className="reveal"
              style={{
                background: "#FFFFFF",
                borderRadius: 12,
                padding: "36px 32px",
                boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
                border: "1px solid #E8E8E8",
                transition: "transform 0.25s ease, box-shadow 0.25s ease",
                transitionDelay: `${i * 0.1}s`,
                cursor: "default",
              }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-4px)"; el.style.boxShadow = "0 12px 40px rgba(0,0,0,0.1)" }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(0)"; el.style.boxShadow = "0 2px 16px rgba(0,0,0,0.06)" }}
            >
              <div style={{ fontFamily: "var(--font-syne)", fontSize: "clamp(32px,3.5vw,48px)", fontWeight: 700, color: "#1DB954", lineHeight: 1, marginBottom: 12 }}>{c.stat}</div>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{c.icon}</div>
              <div style={{ fontFamily: "var(--font-syne)", fontSize: 20, fontWeight: 700, color: "#0A0A0A", marginBottom: 12 }}>{c.title}</div>
              <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: 16, color: "#4A4A4A", lineHeight: 1.7, margin: 0 }}>{c.body}</p>
            </div>
          ))}
        </div>

        {/* Callout strip */}
        <div className="reveal" style={{ background: "#1DB954", borderRadius: 8, padding: "20px 32px", textAlign: "center" }}>
          <span style={{ fontFamily: "var(--font-syne)", fontSize: 18, fontWeight: 700, color: "#FFFFFF" }}>
            REVETLY automates all three. Before your morning coffee. ☕
          </span>
        </div>
      </div>
    </section>
  )
}
