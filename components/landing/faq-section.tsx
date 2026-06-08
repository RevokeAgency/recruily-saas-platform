"use client"

import { useState } from "react"
import { useReveal } from "@/lib/hooks/useReveal"

const FAQS = [
  {
    q: "How does the email inbound work?",
    a: "Every job you create in REVETLY gets a unique email address. Add it to your job posting — every application sent there automatically appears in your REVETLY pipeline, CV parsed, scored, and ready.",
  },
  {
    q: "Is REVETLY DSGVO-compliant?",
    a: "100%. All data is processed and stored on EU servers in Frankfurt. We provide AVV documentation, candidate deletion tools, and full DSGVO-ready infrastructure out of the box.",
  },
  {
    q: "Can I embed it on my careers page?",
    a: "Yes. Every job gets a shareable apply link and an embeddable iFrame widget. One line of code on your website. Your branding, your domain, REVETLY power.",
  },
  {
    q: "How accurate is the AI matching?",
    a: "REVETLY scores across 9 weighted categories — not just keywords. Hard skills, experience, languages, location, culture fit and more. You see a full breakdown per candidate so you understand exactly why they scored that way.",
  },
  {
    q: "What happens after the interview is confirmed?",
    a: "REVETLY sends calendar invites, confirmation emails, and reminders to both sides automatically. After that — it's all you.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. No contracts, no lock-in. Cancel from your dashboard in under 60 seconds.",
  },
]

export function FAQSection() {
  const [open, setOpen] = useState<number | null>(null)
  const ref = useReveal()

  return (
    <section id="faq" ref={ref} style={{ background: "#FFFFFF", padding: "96px 24px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <h2 className="reveal" style={{ fontFamily: "var(--font-syne)", fontSize: "clamp(26px,3vw,38px)", fontWeight: 700, color: "#0A0A0A", textAlign: "center", marginBottom: 56 }}>
          Questions? Answered.
        </h2>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {FAQS.map((faq, i) => (
            <div
              key={i}
              className="reveal"
              style={{ borderBottom: "1px solid #E8E8E8", transitionDelay: `${i * 0.06}s` }}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                style={{
                  width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "22px 0", background: "none", border: "none", cursor: "pointer", textAlign: "left",
                  gap: 16,
                }}
              >
                <span style={{ fontFamily: "var(--font-syne)", fontSize: 17, fontWeight: 600, color: "#0A0A0A", lineHeight: 1.4 }}>{faq.q}</span>
                <span style={{
                  flexShrink: 0, width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#1DB954", fontSize: 18, fontWeight: 300,
                  transform: open === i ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.3s ease",
                }}>
                  &#8964;
                </span>
              </button>
              <div style={{
                maxHeight: open === i ? 300 : 0,
                overflow: "hidden",
                transition: "max-height 0.35s ease",
              }}>
                <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: 16, color: "#4A4A4A", lineHeight: 1.7, margin: 0, paddingBottom: 20 }}>
                  {faq.a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
