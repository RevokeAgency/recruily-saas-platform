"use client"

import { Check } from "lucide-react"

import { useReveal } from "@/lib/hooks/useReveal"

const CHIPS = [
  "Verarbeitung in der EU",
  "Löschung nach 180 Tagen",
  "Lernt nur für dich, nur mit Zustimmung",
  "Entscheidung beim Menschen",
]

export function RvPrivacy() {
  const ref = useReveal()

  return (
    <section id="datenschutz" ref={ref} className="relative overflow-hidden bg-[var(--rv-mist)] py-[clamp(72px,9vw,130px)]">
      <div className="rv-patternbg" data-pattern="rings" />
      <div className="relative z-[1] mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div
          className="reveal grid grid-cols-1 gap-10 rounded-[var(--rv-radius-lg)] bg-[var(--rv-ink)] p-[clamp(28px,4vw,52px)] lg:grid-cols-[1fr_auto] lg:items-center lg:gap-16"
          data-dir="scale"
        >
          <div className="flex flex-col gap-[18px]">
            <h2 className="text-[clamp(1.8rem,3.4vw,2.5rem)] leading-[1.12] font-bold tracking-[-0.025em] text-white">
              Bewerberdaten bleiben <span className="rv-gradient-text">in der EU.</span>
            </h2>
            <p className="text-[clamp(0.98rem,1.4vw,1.12rem)] leading-[1.68] text-white/86">
              Bewerbungsunterlagen gehören zu den sensibelsten Daten in deinem Unternehmen.
              Revetly speichert und wertet sie ausschließlich in der EU aus. Nach 180 Tagen werden
              sie automatisch gelöscht, und Bewerber können ihre Löschung jederzeit selbst
              anstoßen.
            </p>
            <p className="text-[.92rem] leading-[1.65] text-white/58">
              Revetly kann aus deinen Einstellungsentscheidungen lernen und wird so mit jeder
              besetzten Stelle treffsicherer, und zwar nur für dein Konto. Das passiert nur mit
              deiner ausdrücklichen Zustimmung, und du kannst sie jederzeit widerrufen.
            </p>
          </div>
          <ul className="flex flex-col gap-2.5">
            {CHIPS.map((chip) => (
              <li
                key={chip}
                className="flex items-center gap-2 rounded-full border border-white/11 bg-white/7 px-[15px] py-[9px] text-[.81rem] font-semibold text-white/80 lg:whitespace-nowrap"
              >
                <Check className="h-3 w-3 flex-none text-[var(--rv-green)]" strokeWidth={2.4} />
                {chip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
