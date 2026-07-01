"use client"

import { Fragment, useState } from "react"
import Link from "next/link"
import { Check } from "lucide-react"

import { useReveal } from "@/lib/hooks/useReveal"
import { RvButton } from "./rv-button"
import { RvModal, RvModalTrigger, RvModalContent } from "./rv-modal"

// NOTE: prices/tiers are the marketing placeholders from
// reference/revetly-landing/index.html (Free/Starter/Growth/Pro/Enterprise,
// 0/99/249/499€). They intentionally do NOT match the live billing source
// of truth in lib/plans.ts (4 tiers, 0/49/149/299€) — decided with the user
// pending a separate pass to reconcile marketing copy with actual pricing.
type Tier = {
  name: string
  tag?: string
  desc: string
  monthly: string
  yearly: string
  per: { m: string; y: string } | null
  save?: string
  lead?: string
  features: string[]
  cta: string
  featured?: boolean
}

const TIERS: Tier[] = [
  {
    name: "Free",
    desc: "Zum Reinschnuppern",
    monthly: "€0",
    yearly: "€0",
    per: { m: "/Monat", y: "/Jahr" },
    features: [
      "1 aktiver Job",
      "5 AI Matches / Monat",
      "CV Upload & Parsing",
      "Public Apply Page",
      "AI Matching Score (Basic)",
      "Rejection Emails",
    ],
    cta: "Loslegen",
  },
  {
    name: "Starter",
    desc: "Für Einzel-Recruiter",
    monthly: "€99",
    yearly: "€990",
    per: { m: "/Monat", y: "/Jahr" },
    save: "2 Monate gratis",
    lead: "Alles aus Free, plus:",
    features: [
      "3 aktive Jobs",
      "50 AI Matches / Monat",
      "Voller AI Matching Score",
      "Interview .ics Invites",
      "Email Inbound Parsing",
      "GDPR Export & Email Support",
    ],
    cta: "Starter wählen",
  },
  {
    name: "Growth",
    tag: "Am beliebtesten",
    desc: "Für wachsende Teams",
    monthly: "€249",
    yearly: "€2.490",
    per: { m: "/Monat", y: "/Jahr" },
    save: "2 Monate gratis",
    lead: "Alles aus Starter, plus:",
    features: [
      "10 aktive Jobs",
      "300 AI Matches / Monat",
      "Global Candidate Pool",
      "Kandidaten-Suche",
      "Analytics Dashboard",
      "Priority Support · 5 Team-Mitglieder",
    ],
    cta: "Growth wählen",
    featured: true,
  },
  {
    name: "Pro",
    desc: "Für Agenturen & HR-Teams",
    monthly: "€499",
    yearly: "€4.990",
    per: { m: "/Monat", y: "/Jahr" },
    save: "2 Monate gratis",
    lead: "Alles aus Growth, plus:",
    features: [
      "Unlimited Jobs",
      "1.000 AI Matches / Monat",
      "AI Outreach",
      "API-Zugang",
      "Unlimited Team-Mitglieder",
      "Dedizierter Support",
    ],
    cta: "Pro wählen",
  },
  {
    name: "Enterprise",
    desc: "Für Konzerne & Volumen",
    monthly: "Custom",
    yearly: "Custom",
    per: null,
    lead: "Alles aus Pro, plus:",
    features: [
      "Custom Matches & Volumen",
      "White Label",
      "Verhandelbare Overage-Preise",
      "SLA & dedizierter Ansprechpartner",
      "Onboarding & Schulung",
    ],
    cta: "Kontakt",
  },
]

const MATRIX_GROUPS: Array<{ group: string; rows: Array<{ label: string; values: (string | boolean)[] }> }> = [
  {
    group: "Jobs & Matches",
    rows: [
      { label: "Aktive Jobs", values: ["1", "3", "10", "Unlimited", "Custom"] },
      { label: "AI Matches / Monat", values: ["5", "50", "300", "1.000", "Custom SLA"] },
      { label: "Overage pro Match", values: ["—", "—", "€0,49", "€0,29", "Verhandelt"] },
    ],
  },
  {
    group: "Core Features",
    rows: [
      { label: "CV Upload & Parsing", values: [true, true, true, true, true] },
      { label: "Public Apply Page", values: [true, true, true, true, true] },
      { label: "AI Matching Score", values: ["Basic", true, true, true, true] },
      { label: "Rejection Emails", values: [true, true, true, true, true] },
      { label: "Interview .ics Invite", values: ["—", true, true, true, true] },
      { label: "Email Inbound Parsing", values: ["—", true, true, true, true] },
      { label: "Global Candidate Pool", values: ["—", "—", true, true, true] },
      { label: "Kandidaten-Suche", values: ["—", "—", true, true, true] },
      { label: "Analytics Dashboard", values: ["—", "Basic", true, true, true] },
      { label: "AI Outreach", values: ["—", "—", "—", true, true] },
      { label: "API Access", values: ["—", "—", "—", "—", true] },
      { label: "White Label", values: ["—", "—", "—", "—", true] },
    ],
  },
  {
    group: "Team & Support",
    rows: [
      { label: "Team Members", values: ["1", "2", "5", "Unlimited", "Unlimited"] },
      { label: "GDPR Export", values: ["—", true, true, true, true] },
      { label: "Support", values: ["Community", "Email", "Priority", "Dedicated", "SLA"] },
    ],
  },
]

export function RvPricing() {
  const ref = useReveal()
  const [yearly, setYearly] = useState(false)

  return (
    <section id="pricing" ref={ref} className="relative overflow-hidden bg-white py-[clamp(72px,9vw,130px)]">
      <div className="rv-patternbg" data-pattern="cross" />
      <div className="relative z-[1] mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="reveal mx-auto max-w-[660px] text-center">
          <span className="rv-eyebrow inline-flex items-center gap-2 rounded-full border border-[rgba(12,26,22,.10)] bg-white px-3.5 py-[7px] text-[var(--rv-ink-soft)] shadow-[var(--rv-shadow-sm)] before:h-[7px] before:w-[7px] before:rounded-full before:bg-[image:var(--rv-gradient)]">
            Preise
          </span>
          <h2 className="mt-[22px] text-[clamp(1.9rem,3.6vw,2.7rem)] leading-[1.12] font-bold tracking-[-0.025em] text-[var(--rv-ink)]">
            Transparent. Fair. Skalierbar.
          </h2>
          <p className="mt-[18px] text-[clamp(1rem,1.25vw,1.12rem)] leading-[1.65] text-[var(--rv-muted)]">
            Starte gratis. Wachse, wenn dein Recruiting wächst. Jederzeit kündbar.
          </p>
        </div>

        <div className="reveal mt-9 flex flex-col items-center gap-3.5">
          <div className="relative inline-flex rounded-full border border-[rgba(12,26,22,.10)] bg-[var(--rv-mist)] p-[5px]" role="tablist" aria-label="Abrechnungszeitraum">
            <span
              className="absolute top-[5px] bottom-[5px] left-[5px] z-0 w-[calc(50%-5px)] rounded-full bg-white shadow-[var(--rv-shadow-sm)] transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{ transform: yearly ? "translateX(100%)" : "none" }}
              aria-hidden="true"
            />
            <button
              type="button"
              role="tab"
              aria-selected={!yearly}
              onClick={() => setYearly(false)}
              className={`relative z-[1] min-w-[116px] rounded-full px-[22px] py-[10px] text-[.9rem] font-bold transition-colors duration-300 ${!yearly ? "text-[var(--rv-ink)]" : "text-[var(--rv-muted)]"}`}
            >
              Monatlich
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={yearly}
              onClick={() => setYearly(true)}
              className={`relative z-[1] min-w-[116px] rounded-full px-[22px] py-[10px] text-[.9rem] font-bold transition-colors duration-300 ${yearly ? "text-[var(--rv-ink)]" : "text-[var(--rv-muted)]"}`}
            >
              Jährlich
            </button>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[.8rem] font-bold text-[var(--rv-green-deep)]">
            <Check className="h-3.5 w-3.5" strokeWidth={2.6} />
            <span className="rounded-full bg-[rgba(22,199,124,.12)] px-[11px] py-1">2 Monate gratis pro Jahr</span>
          </span>
        </div>

        <div className="mt-11 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5 lg:items-stretch">
          {TIERS.map((tier, i) => (
            <div
              key={tier.name}
              className={`reveal relative flex flex-col p-[26px_20px] transition-transform duration-300 hover:-translate-y-1 ${i > 0 ? `s${Math.min(i, 5)}` : ""} ${
                tier.featured
                  ? "rv-price-featured text-[#cfe5de] shadow-[var(--rv-shadow-lg)]"
                  : "border border-[rgba(12,26,22,.10)] bg-white"
              }`}
              style={{ borderRadius: "var(--rv-radius)" }}
            >
              {tier.tag && (
                <span className="absolute -top-[13px] left-1/2 -translate-x-1/2 rounded-full bg-[image:var(--rv-gradient)] px-[13px] py-1.5 text-[.66rem] font-extrabold tracking-[.05em] whitespace-nowrap text-[var(--rv-ink)] uppercase">
                  {tier.tag}
                </span>
              )}
              <div className={`mb-1 text-[1.05rem] font-bold ${tier.featured ? "text-white" : "text-[var(--rv-ink)]"}`}>{tier.name}</div>
              <div className={`mb-[18px] min-h-[2.2em] text-[.8rem] ${tier.featured ? "text-[#9fc2ba]" : "text-[var(--rv-muted)]"}`}>{tier.desc}</div>
              <div className={`mb-0.5 text-[2.1rem] leading-none font-extrabold tracking-[-0.03em] ${tier.featured ? "text-white" : "text-[var(--rv-ink)]"}`}>
                {yearly ? tier.yearly : tier.monthly}{" "}
                {tier.per && (
                  <span className={`text-[.82rem] font-medium ${tier.featured ? "text-[#9fc2ba]" : "text-[var(--rv-muted)]"}`}>
                    {yearly ? tier.per.y : tier.per.m}
                  </span>
                )}
              </div>
              <div className={`mt-[7px] min-h-[1.1em] text-[.72rem] font-bold tracking-[.01em] ${tier.featured ? "text-[var(--rv-green)]" : "text-[var(--rv-green-deep)]"}`}>
                {yearly ? tier.save : ""}
              </div>
              <ul className="my-5 flex-1">
                {tier.lead && (
                  <li className={`mb-3 text-[.74rem] font-bold tracking-[.05em] uppercase ${tier.featured ? "text-[#8fb3ab]" : "text-[var(--rv-muted)]"}`}>
                    {tier.lead}
                  </li>
                )}
                {tier.features.map((f) => (
                  <li key={f} className={`relative mb-2.5 pl-[23px] text-[.85rem] leading-[1.42] ${tier.featured ? "text-[#b9d4cc]" : "text-[var(--rv-ink-soft)]"}`}>
                    <Check className={`absolute top-[3px] left-0 h-[15px] w-[15px] ${tier.featured ? "text-[var(--rv-green)]" : "text-[var(--rv-green-deep)]"}`} strokeWidth={2.6} />
                    {f}
                  </li>
                ))}
              </ul>
              <RvButton
                variant={tier.featured ? "grad" : "ghost"}
                className="w-full"
                asChild
              >
                <Link href={tier.name === "Enterprise" ? "#faq" : "/auth/register"}>{tier.cta}</Link>
              </RvButton>
            </div>
          ))}
        </div>

        <div className="reveal mt-9 flex flex-col items-center gap-3">
          <RvModal>
            <RvModalTrigger asChild>
              <RvButton variant="ghost" size="lg">
                Alle Features im Detail vergleichen
              </RvButton>
            </RvModalTrigger>
            <RvModalContent title="Alle Features im Vergleich" subtitle="Free · Starter · Growth · Pro · Enterprise">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse">
                  <thead>
                    <tr>
                      <th className="sticky top-0 left-0 z-[3] border-b-2 border-[rgba(12,26,22,.10)] bg-white pt-[18px] pb-[18px] text-left" />
                      {TIERS.map((tier) => (
                        <th key={tier.name} className="sticky top-0 z-[2] border-b-2 border-[rgba(12,26,22,.10)] bg-white pt-[18px] pb-[18px] text-center">
                          <span className="text-[.96rem] font-bold tracking-[-0.01em] text-[var(--rv-ink)]">{tier.name}</span>
                          {tier.tag && <span className="mt-[3px] block text-[.62rem] font-extrabold tracking-[.06em] text-[var(--rv-green-deep)] uppercase">Beliebt</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MATRIX_GROUPS.map((group) => (
                      <Fragment key={group.group}>
                        <tr className="bg-[var(--rv-mist)]">
                          <td colSpan={TIERS.length + 1} className="px-3.5 py-3.5 text-left text-[.7rem] font-extrabold tracking-[.07em] text-[var(--rv-muted)] uppercase">
                            {group.group}
                          </td>
                        </tr>
                        {group.rows.map((row) => (
                          <tr key={row.label} className="hover:bg-[var(--rv-mist)]">
                            <td className="sticky left-0 z-[1] min-w-[210px] border-b border-[rgba(12,26,22,.10)] bg-white px-3.5 py-[13px] text-left text-[.84rem] font-semibold text-[var(--rv-ink-soft)]">
                              {row.label}
                            </td>
                            {row.values.map((v, ci) => (
                              <td
                                key={ci}
                                className={`border-b border-[rgba(12,26,22,.10)] px-3.5 py-[13px] text-center text-[.84rem] ${ci === 2 ? "bg-[rgba(22,199,124,.05)]" : ""}`}
                              >
                                {v === true ? (
                                  <Check className="mx-auto h-[17px] w-[17px] text-[var(--rv-green-deep)]" strokeWidth={2.6} />
                                ) : v === "—" ? (
                                  <span className="font-semibold text-[rgba(12,26,22,.16)]">—</span>
                                ) : (
                                  <span className="font-bold text-[var(--rv-ink)]">{v}</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </RvModalContent>
          </RvModal>
          <p className="text-[.8rem] text-[var(--rv-muted)]">18 Features &middot; 5 Pläne im direkten Vergleich</p>
        </div>
      </div>
    </section>
  )
}
