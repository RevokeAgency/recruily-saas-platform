"use client"

import { useState } from "react"
import Link from "next/link"
import { useReveal } from "@/lib/hooks/useReveal"

const PLANS = [
  {
    name: "Starter",
    sub: "For growing teams",
    monthly: 99,
    annual: 79,
    popular: false,
    cta: "Start Free Trial",
    ctaSolid: false,
    features: [
      "Up to 3 active job containers",
      "Email inbound (auto-routing)",
      "AI CV matching + scoring",
      "Shareable apply link",
      "Candidate dashboard",
      "Email support",
    ],
  },
  {
    name: "Professional",
    sub: "For active recruiting teams",
    monthly: 249,
    annual: 199,
    popular: true,
    cta: "Start Free Trial",
    ctaSolid: true,
    features: [
      "Up to 10 active job containers",
      "Everything in Starter",
      "AI Voice Screening",
      "Auto-scheduling & reminders",
      "Candidate auto-outreach",
      "Priority support",
    ],
  },
  {
    name: "Agency",
    sub: "For staffing firms",
    monthly: 499,
    annual: 399,
    popular: false,
    cta: "Contact Sales",
    ctaSolid: false,
    features: [
      "Unlimited job containers",
      "Everything in Professional",
      "iFrame embed widget",
      "White label option",
      "Dedicated account manager",
      "Custom onboarding",
    ],
  },
]

export function PricingSection() {
  const [annual, setAnnual] = useState(false)
  const ref = useReveal()

  return (
    <section id="pricing" ref={ref} style={{ background: "#F8F7F4", padding: "96px 24px" }}>
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>
        {/* Label */}
        <div className="reveal" style={{ fontFamily: "var(--font-dm-sans)", fontSize: 13, color: "#1DB954", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, marginBottom: 16, textAlign: "center" }}>
          Pricing
        </div>

        {/* Headline */}
        <h2 className="reveal" style={{ fontFamily: "var(--font-syne)", fontSize: "clamp(28px,3.4vw,44px)", fontWeight: 700, color: "#0A0A0A", lineHeight: 1.2, textAlign: "center", marginBottom: 12 }}>
          Simple pricing.<br />No surprises.
        </h2>

        {/* Subline */}
        <p className="reveal" style={{ fontFamily: "var(--font-dm-sans)", fontSize: 17, color: "#4A4A4A", textAlign: "center", marginBottom: 36 }}>
          Every plan includes DSGVO-compliant processing, EU servers, and free onboarding.
        </p>

        {/* Toggle */}
        <div className="reveal" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 52 }}>
          <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: 15, color: annual ? "#4A4A4A" : "#0A0A0A", fontWeight: annual ? 400 : 600 }}>Monthly</span>
          <button
            onClick={() => setAnnual(!annual)}
            style={{
              width: 52, height: 28, borderRadius: 14, border: "none", cursor: "pointer",
              background: annual ? "#1DB954" : "#E8E8E8",
              position: "relative", transition: "background 0.25s",
              flexShrink: 0,
            }}
          >
            <span style={{ position: "absolute", top: 3, left: annual ? 27 : 3, width: 22, height: 22, borderRadius: "50%", background: "#FFFFFF", transition: "left 0.25s", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }} />
          </button>
          <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: 15, color: annual ? "#0A0A0A" : "#4A4A4A", fontWeight: annual ? 600 : 400 }}>Annual</span>
          {annual && (
            <span style={{ fontSize: 12, fontWeight: 600, color: "#1DB954", background: "#F0FAF4", border: "1px solid #1DB95440", padding: "3px 10px", borderRadius: 20 }}>Save 20%</span>
          )}
        </div>

        {/* Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px,1fr))", gap: 20, alignItems: "start" }}>
          {PLANS.map((plan, i) => (
            <div
              key={plan.name}
              className="reveal"
              style={{
                background: "#FFFFFF",
                borderRadius: 12,
                border: plan.popular ? "none" : "1px solid #E8E8E8",
                padding: "36px 28px",
                position: "relative",
                boxShadow: plan.popular ? "0 8px 40px rgba(0,0,0,0.12)" : "0 2px 12px rgba(0,0,0,0.04)",
                transform: plan.popular ? "scale(1.02)" : "scale(1)",
                transitionDelay: `${i * 0.1}s`,
                borderTop: plan.popular ? "3px solid #1DB954" : undefined,
              }}
            >
              {plan.popular && (
                <span style={{ position: "absolute", top: 16, right: 16, fontSize: 11, fontWeight: 700, color: "#FFFFFF", background: "#1DB954", padding: "4px 10px", borderRadius: 4 }}>
                  Most Popular
                </span>
              )}
              <div style={{ fontFamily: "var(--font-syne)", fontSize: 20, fontWeight: 700, color: "#0A0A0A", marginBottom: 4 }}>{plan.name}</div>
              <div style={{ fontFamily: "var(--font-dm-sans)", fontSize: 14, color: "#4A4A4A", marginBottom: 20 }}>{plan.sub}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 24 }}>
                <span style={{ fontFamily: "var(--font-syne)", fontSize: 40, fontWeight: 700, color: "#0A0A0A" }}>€{annual ? plan.annual : plan.monthly}</span>
                <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: 14, color: "#4A4A4A" }}>/mo</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "flex", flexDirection: "column", gap: 10 }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontFamily: "var(--font-dm-sans)", fontSize: 14, color: "#4A4A4A" }}>
                    <span style={{ color: "#1DB954", fontWeight: 700, flexShrink: 0 }}>&#10003;</span>{f}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.name === "Agency" ? "#contact" : "/auth"}
                style={{
                  display: "block", textAlign: "center", textDecoration: "none",
                  fontFamily: "var(--font-dm-sans)", fontSize: 15, fontWeight: 600,
                  padding: "12px 0", borderRadius: 6,
                  color: plan.ctaSolid ? "#FFFFFF" : "#1DB954",
                  background: plan.ctaSolid ? "#1DB954" : "transparent",
                  border: `2px solid #1DB954`,
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.background = plan.ctaSolid ? "#158A3E" : "#1DB954"
                  el.style.color = "#FFFFFF"
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.background = plan.ctaSolid ? "#1DB954" : "transparent"
                  el.style.color = plan.ctaSolid ? "#FFFFFF" : "#1DB954"
                }}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Fine print */}
        <p className="reveal" style={{ fontFamily: "var(--font-dm-sans)", fontSize: 14, color: "#888", textAlign: "center", marginTop: 36 }}>
          All plans &middot; Cancel anytime &middot; EU servers &middot; DSGVO-compliant &middot; Free 14-day trial
        </p>
      </div>
    </section>
  )
}
