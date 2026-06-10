"use client"

import { useReveal } from "@/lib/hooks/useReveal"
import { ShieldCheck, Server, Zap } from "lucide-react"

const channels = ["Karriere.at Integration", "Email Inbound Automation", "Embed on Your Website"]

const trust = [
  {
    icon: ShieldCheck,
    title: "DSGVO Compliant",
    body: "All data processed and stored on EU servers in Frankfurt. Full AVV documentation included.",
  },
  {
    icon: Server,
    title: "EU Servers Only",
    body: "Your candidate data never leaves the EU. Encrypted at rest and in transit. AES-256 standard.",
  },
  {
    icon: Zap,
    title: "Instant Setup",
    body: "No IT department needed. No data migration. Live in under 5 minutes.",
  },
]

export function ChannelsTrust() {
  const { ref, visible } = useReveal<HTMLDivElement>()

  return (
    <section ref={ref} className="px-4 py-24 sm:px-6 lg:px-8" style={{ backgroundColor: "#0D1F14" }}>
      <div className="mx-auto max-w-7xl">
        {/* Channels */}
        <div className="text-center">
          <h2 className={`reveal ${visible ? "visible" : ""} font-syne text-3xl font-bold text-white sm:text-4xl`}>
            REVETLY works where you recruit.
          </h2>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            {channels.map((c, i) => (
              <span
                key={c}
                className={`reveal ${visible ? "visible" : ""} rounded-full border px-6 py-3 font-dm-sans text-sm font-medium text-white`}
                style={{
                  backgroundColor: "#1A2E1E",
                  borderColor: "#2D4A35",
                  transitionDelay: `${0.1 + i * 0.1}s`,
                }}
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        {/* Compliance cards */}
        <div className="mt-24">
          <p
            className={`reveal ${visible ? "visible" : ""} text-center font-dm-sans text-xs font-semibold uppercase tracking-[0.1em]`}
            style={{ color: "#1DB954" }}
          >
            Compliance
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {trust.map((t, i) => {
              const Icon = t.icon
              return (
                <div
                  key={t.title}
                  className={`reveal ${visible ? "visible" : ""} rounded-2xl border p-8 transition-all duration-300 hover:-translate-y-1`}
                  style={{
                    backgroundColor: "#1A2E1E",
                    borderColor: "#2D4A35",
                    transitionDelay: `${0.15 + i * 0.12}s`,
                  }}
                >
                  <div
                    className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{ backgroundColor: "rgba(29,185,84,0.12)" }}
                  >
                    <Icon className="h-5 w-5" style={{ color: "#1DB954" }} />
                  </div>
                  <h3 className="font-syne text-xl font-bold text-white">{t.title}</h3>
                  <p className="mt-3 font-dm-sans text-sm leading-relaxed" style={{ color: "#A8C4B0" }}>
                    {t.body}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
