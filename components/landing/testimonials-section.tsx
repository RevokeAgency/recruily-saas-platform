"use client"

import { useReveal } from "@/lib/hooks/useReveal"

const TESTIMONIALS = [
  {
    quote: "We stopped drowning in CVs. REVETLY reads them, scores them, and tells us exactly who to talk to. The rest takes care of itself.",
    name: "Sarah M.",
    role: "HR Manager",
    company: "Personalleasing Firm, Vienna",
  },
  {
    quote: "Setup took 4 minutes. First application was in our pipeline before I even finished my coffee. I didn't believe it until I saw it.",
    name: "Thomas K.",
    role: "Head of Recruiting",
    company: "Tech Startup, Munich",
  },
  {
    quote: "The iFrame alone is worth the subscription. Our careers page now feeds directly into REVETLY. Candidates, scored, waiting for us.",
    name: "Julia P.",
    role: "Talent Acquisition Lead",
    company: "Staffing Agency, Zürich",
  },
]

export function TestimonialsSection() {
  const ref = useReveal()

  return (
    <section ref={ref} style={{ background: "#0D1F14", padding: "96px 24px" }}>
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>
        <div className="reveal" style={{ fontFamily: "var(--font-dm-sans)", fontSize: 13, color: "#1DB954", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, marginBottom: 16, textAlign: "center" }}>
          What Teams Say
        </div>
        <h2 className="reveal" style={{ fontFamily: "var(--font-syne)", fontSize: "clamp(26px,3.2vw,42px)", fontWeight: 700, color: "#FFFFFF", lineHeight: 1.2, textAlign: "center", marginBottom: 56 }}>
          Recruiting teams across DACH<br />use REVETLY every day.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px,1fr))", gap: 20 }}>
          {TESTIMONIALS.map((t, i) => (
            <div
              key={t.name}
              className="reveal"
              style={{
                background: "#1A2E1F",
                border: "1px solid #2D4A35",
                borderRadius: 12,
                padding: "32px 28px",
                display: "flex",
                flexDirection: "column",
                gap: 20,
                transitionDelay: `${i * 0.15}s`,
              }}
            >
              <div style={{ fontFamily: "var(--font-fraunces)", fontSize: 56, color: "#1DB954", lineHeight: 0.7, userSelect: "none" }}>&ldquo;</div>
              <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: 16, color: "#FFFFFF", lineHeight: 1.7, margin: 0, flex: 1 }}>{t.quote}</p>
              <div style={{ display: "flex", gap: 3 }}>
                {Array.from({ length: 5 }).map((_, si) => (
                  <span key={si} style={{ color: "#1DB954", fontSize: 16 }}>&#9733;</span>
                ))}
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-syne)", fontSize: 14, fontWeight: 700, color: "#FFFFFF" }}>{t.name}</div>
                <div style={{ fontFamily: "var(--font-dm-sans)", fontSize: 13, color: "#A8C4B0", marginTop: 2 }}>{t.role}</div>
                <div style={{ fontFamily: "var(--font-dm-sans)", fontSize: 12, color: "#A8C4B0", marginTop: 1 }}>{t.company}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
