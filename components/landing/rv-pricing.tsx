"use client"

import { Fragment, useState } from "react"
import Link from "next/link"
import { Check, Minus } from "lucide-react"

import { useReveal } from "@/lib/hooks/useReveal"
import { RvButton } from "./rv-button"
import { RvModal, RvModalTrigger, RvModalContent } from "./rv-modal"
import { PLANS } from "@/lib/plans"

// Preise, Kontingente und Stellen kommen aus lib/plans.ts, derselben Quelle
// wie die Abrechnung. Hart geschriebene Zahlen sind hier früher schon einmal
// auseinandergelaufen ("5 Matches pro Monat", während die Datenbank anders
// zählte). Hart stehen nur noch Funktionsbeschreibungen, keine Mengen.

type Tier = {
  name: string
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

const euro = (n: number) => `€${n.toLocaleString("de-DE")}`
const PER = { m: "/Monat", y: "/Jahr" }
const SAVE = "2 Monate gratis"
const fmt = (n: number) => n.toLocaleString("de-DE")

const TIERS: Tier[] = [
  {
    name: "Free",
    desc: "Zum Testen mit einer echten Stelle",
    monthly: euro(PLANS.free.price_monthly),
    yearly: euro(PLANS.free.price_yearly),
    // Kein "/Monat": Die Probestelle ist einmalig und läuft nicht monatlich.
    per: null,
    features: [
      "1 Probestelle",
      `${fmt(PLANS.free.matches)} Matches einmalig`,
      "Lebenslauf-Upload, auch gescannte PDFs",
      "Öffentliche Bewerbungsseite",
      "Revetly Match Analyse mit Gesamtscore",
      "Absagen per E-Mail",
    ],
    cta: "Gratis starten",
  },
  {
    name: "Starter",
    desc: "Für Einzel-Recruiter",
    monthly: euro(PLANS.starter.price_monthly),
    yearly: euro(PLANS.starter.price_yearly),
    per: PER,
    save: SAVE,
    lead: "Alles aus Free, plus:",
    features: [
      `${PLANS.starter.active_jobs} aktive Stellen`,
      `${fmt(PLANS.starter.matches)} Matches pro Monat`,
      "Alle neun Ebenen mit Begründung und Belegen",
      "K.O.-Kriterien pro Stelle",
      "Bewerbungen per E-Mail an die Stellenadresse",
      "Terminbuchung mit Google- und Microsoft-Kalender",
    ],
    cta: "Starter wählen",
  },
  {
    name: "Growth",
    desc: "Für wachsende Teams",
    monthly: euro(PLANS.growth.price_monthly),
    yearly: euro(PLANS.growth.price_yearly),
    per: PER,
    save: SAVE,
    lead: "Alles aus Starter, plus:",
    features: [
      `${PLANS.growth.active_jobs} aktive Stellen`,
      `${fmt(PLANS.growth.matches)} Matches pro Monat`,
      "Talent-Pool: neue Stellen gegen alte Bewerber",
      "Strukturierte Interviewleitfäden",
      "Bestenvergleich innerhalb einer Stelle",
      "Auswertungen im Dashboard",
    ],
    cta: "Growth wählen",
    featured: true,
  },
  {
    name: "Pro",
    desc: "Für Agenturen & HR-Teams",
    monthly: euro(PLANS.pro.price_monthly),
    yearly: euro(PLANS.pro.price_yearly),
    per: PER,
    save: SAVE,
    lead: "Alles aus Growth, plus:",
    features: [
      "Unbegrenzt viele Stellen",
      `${fmt(PLANS.pro.matches)} Matches pro Monat`,
      "Gewichtung lernt aus deinen Einstellungen",
      "Vorrangiger Support",
    ],
    cta: "Pro wählen",
  },
  {
    name: "Enterprise",
    desc: "Für Konzerne und hohes Volumen",
    monthly: "Custom",
    yearly: "Custom",
    per: null,
    lead: "Alles aus Pro, plus:",
    features: [
      "Volumen nach Absprache",
      "Verhandelbare Preise über dem Kontingent",
      "Fester Ansprechpartner",
      "Einrichtung und Schulung",
    ],
    cta: "Kontakt",
  },
]

// false = nicht enthalten. Wird als Symbol mit Screenreader-Text gezeigt,
// nicht als Strich: Ein Strich in einer Tabelle ist für Vorleseprogramme
// bedeutungslos und liest sich wie ein Gedankenstrich.
const MATRIX_GROUPS: Array<{ group: string; rows: Array<{ label: string; values: (string | boolean)[] }> }> = [
  {
    group: "Stellen & Matches",
    rows: [
      {
        label: "Stellen",
        values: [
          "1 Probestelle",
          `${PLANS.starter.active_jobs} aktiv`,
          `${PLANS.growth.active_jobs} aktiv`,
          "Unbegrenzt",
          "Individuell",
        ],
      },
      {
        label: "Matches",
        values: [
          `${fmt(PLANS.free.matches)} einmalig`,
          `${fmt(PLANS.starter.matches)} / Monat`,
          `${fmt(PLANS.growth.matches)} / Monat`,
          `${fmt(PLANS.pro.matches)} / Monat`,
          "Nach SLA",
        ],
      },
      { label: "Preis über dem Kontingent", values: [false, false, "€0,49", "€0,29", "nach Absprache"] },
    ],
  },
  {
    group: "Kernfunktionen",
    rows: [
      { label: "Lebenslauf-Upload & Auslesen", values: [true, true, true, true, true] },
      { label: "Öffentliche Bewerbungsseite", values: [true, true, true, true, true] },
      { label: "Revetly Match Analyse", values: ["Gesamtscore", true, true, true, true] },
      { label: "Absagen per E-Mail", values: [true, true, true, true, true] },
      { label: "Terminbuchung durch den Bewerber", values: [false, true, true, true, true] },
      { label: "Bewerbung per E-Mail", values: [false, true, true, true, true] },
      { label: "Talent-Pool abgleichen", values: [false, false, true, true, true] },
      { label: "Strukturierte Interviews", values: [false, false, true, true, true] },
      { label: "Auswertungen", values: [false, "einfach", true, true, true] },
      { label: "Gewichtung lernt mit", values: [false, false, false, true, true] },
      { label: "Volumen nach Absprache", values: [false, false, false, false, true] },
      { label: "Einrichtung und Schulung", values: [false, false, false, false, true] },
    ],
  },
  {
    group: "Team & Support",
    rows: [
      { label: "Teammitglieder", values: ["1", "2", "5", "Unbegrenzt", "Unbegrenzt"] },
      { label: "DSGVO-Export", values: [false, true, true, true, true] },
      { label: "Support", values: ["Community", "E-Mail", "Priorität", "Fest zugeordnet", "SLA"] },
    ],
  },
]

const FEATURE_COUNT = MATRIX_GROUPS.reduce((n, g) => n + g.rows.length, 0)

export function RvPricing() {
  const ref = useReveal()
  const [yearly, setYearly] = useState(false)

  return (
    <section id="preise" ref={ref} className="relative overflow-hidden bg-white py-[clamp(72px,9vw,130px)]">
      <div className="rv-patternbg" data-pattern="cross" />
      <div className="relative z-[1] mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="reveal mx-auto max-w-[660px] text-center">
          <span className="rv-eyebrow inline-flex items-center gap-2 rounded-full border border-[rgba(12,26,22,.10)] bg-white px-3.5 py-[7px] text-[var(--rv-ink-soft)] shadow-[var(--rv-shadow-sm)] before:h-[7px] before:w-[7px] before:rounded-full before:bg-[image:var(--rv-gradient)]">
            Preise
          </span>
          <h2 className="mt-[22px] text-[clamp(1.9rem,3.6vw,2.7rem)] leading-[1.12] font-bold tracking-[-0.025em] text-[var(--rv-ink)]">
            Starte mit einer Stelle. <span className="rv-gradient-text">Wachse mit deinem Stapel.</span>
          </h2>
          <p className="mt-[18px] text-[clamp(1rem,1.25vw,1.12rem)] leading-[1.65] text-[var(--rv-muted)]">
            Du startest gratis und wechselst erst, wenn dein Volumen wächst.
            Monatlich kündbar, ohne Mindestlaufzeit und ohne Einrichtungsgebühr.
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
                {tier.name === "Enterprise" ? (
                  <a href="mailto:hallo@revetly.ai">{tier.cta}</a>
                ) : (
                  <Link
                    href={
                      tier.name === "Free"
                        ? "/auth/register"
                        : `/auth/register?plan=${tier.name.toLowerCase()}&interval=${yearly ? "yearly" : "monthly"}`
                    }
                  >
                    {tier.cta}
                  </Link>
                )}
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
                                ) : v === false ? (
                                  <>
                                    <Minus className="mx-auto h-[15px] w-[15px] text-[rgba(12,26,22,.22)]" strokeWidth={2.4} aria-hidden="true" />
                                    <span className="sr-only">nicht enthalten</span>
                                  </>
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
          <p className="text-[.8rem] text-[var(--rv-muted)]">{FEATURE_COUNT} Features &middot; {TIERS.length} Pläne im direkten Vergleich</p>
        </div>
      </div>
    </section>
  )
}
