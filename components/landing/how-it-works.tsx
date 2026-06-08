"use client"

import { useReveal } from "@/lib/hooks/useReveal"

const STEPS = [
  { n: "01", title: "Create a job in REVETLY", sub: "Title, description, requirements" },
  { n: "02", title: "Get your unique inbox", sub: "Dedicated email + apply link + iFrame — automatically generated" },
  { n: "03", title: "Applications flow in", sub: "Via email, web form, or your careers page" },
  { n: "04", title: "AI scores every CV", sub: "Real matching — not keyword counting" },
  { n: "05", title: "Candidates get contacted", sub: "Automatic outreach and voice screening" },
  { n: "06", title: "Interview confirmed", sub: "Calendar invite sent. You show up. Nothing else." },
]

export function HowItWorks() {
  const ref = useReveal()

  return (
    <section id="how-it-works" ref={ref} style={{ background: "#0D1F14", padding: "96px 24px" }}>
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>
        {/* Label */}
        <div className="reveal" style={{ fontFamily: "var(--font-dm-sans)", fontSize: 13, color: "#1DB954", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, marginBottom: 20 }}>
          The Flow
        </div>

        {/* Headline */}
        <h2 className="reveal" style={{ fontFamily: "var(--font-syne)", fontSize: "clamp(28px,3.4vw,44px)", fontWeight: 700, color: "#FFFFFF", lineHeight: 1.2, maxWidth: 640, marginBottom: 64 }}>
          From job posted to interview confirmed.<br />Six steps. Zero manual work.
        </h2>

        {/* Steps grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px,1fr))", gap: 20 }}>
          {STEPS.map((s, i) => (
            <div
              key={s.n}
              className="reveal"
              style={{
                background: "#1A2E1F",
                borderLeft: "3px solid #1DB954",
                borderRadius: 8,
                padding: "28px 24px",
                transitionDelay: `${i * 0.08}s`,
              }}
            >
              <div style={{ fontFamily: "var(--font-syne)", fontSize: 32, fontWeight: 700, color: "#1DB954", marginBottom: 12 }}>{s.n}</div>
              <div style={{ fontFamily: "var(--font-dm-sans)", fontSize: 17, fontWeight: 600, color: "#FFFFFF", marginBottom: 8, lineHeight: 1.3 }}>{s.title}</div>
              <div style={{ fontFamily: "var(--font-dm-sans)", fontSize: 14, color: "#A8C4B0", lineHeight: 1.6 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Bottom callout */}
        <div className="reveal" style={{ marginTop: 48, background: "#152A1E", border: "1px solid #2D4A35", borderRadius: 12, padding: "24px 32px" }}>
          <span style={{ fontFamily: "var(--font-syne)", fontSize: 17, fontWeight: 600, color: "#FFFFFF" }}>
            ⚡ From job posted to interview confirmed — without touching your inbox.
          </span>
        </div>
      </div>
    </section>
  )
}
