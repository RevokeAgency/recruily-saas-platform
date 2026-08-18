"use client"

import { Briefcase, HeartPulse, Store } from "lucide-react"

import { useReveal } from "@/lib/hooks/useReveal"
import { RvCard } from "./rv-card"

// An dieser Stelle standen sechs Kundenstimmen mit Namen, Firmen und Zahlen
// ("Time-to-Hire halbiert", "6 Stunden pro Stelle gespart"). Revetly hat noch
// keine Kunden, die Zitate waren also erfunden. Erfundene Referenzen sind in
// Österreich und der EU unlautere Werbung (UWG-Anhang, Richtlinie 2005/29/EG),
// und sie fliegen beim ersten Interessenten auf, der eine der genannten Firmen
// anruft.
//
// Statt besserer Fantasiezitate steht hier jetzt, für wen Revetly gebaut ist.
// Das verkauft ebenso gut, ist überprüfbar, und die Segmente sind zugleich die
// Suchbegriffe, unter denen diese Kunden suchen.

const SEGMENTE = [
  {
    icon: Briefcase,
    label: "Personalberatung & Zeitarbeit",
    title: "Viele Stellen, wenig Zeit pro Bewerbung",
    text: "Revetly matcht jede neue Stelle automatisch gegen deinen bestehenden Kandidatenpool. Wer sich vor sechs Monaten knapp nicht qualifiziert hat, taucht wieder auf, ohne dass du neu akquirieren musst.",
  },
  {
    icon: Store,
    label: "KMU ohne eigene HR-Abteilung",
    title: "Die Geschäftsführung sortiert nebenbei mit",
    text: "Anzeige einstellen, Apply-Link teilen, Shortlist lesen. Absagen und Terminvereinbarung laufen automatisch, damit niemand abends noch Lebensläufe durchblättert.",
  },
  {
    icon: HeartPulse,
    label: "Reglementierte Berufe",
    title: "Ohne Zulassung hilft der beste Lebenslauf nichts",
    text: "Pflege, Technik, Handwerk: Wo Diplom, Nostrifikation oder Zertifikat Voraussetzung sind, deckelt Revetly den Score, statt sie mit Sprachkenntnissen und Kultur-Fit wegzurechnen.",
  },
]

/**
 * Positionierung nach Segment. Ersetzt die frühere Kundenstimmen-Sektion,
 * solange es keine echten Referenzen gibt.
 */
export function RvTestimonials() {
  const ref = useReveal()

  return (
    <section id="testimonials" ref={ref} className="relative overflow-hidden bg-[var(--rv-mist)] py-[clamp(72px,9vw,130px)]">
      <div className="rv-patternbg" data-pattern="diagonal" />
      <div className="relative z-[1] mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="reveal mx-auto max-w-[660px] text-center" data-dir="scale">
          <span className="rv-eyebrow inline-flex items-center gap-2 rounded-full border border-[rgba(12,26,22,.10)] bg-[var(--rv-mist)] px-3.5 py-[7px] text-[var(--rv-ink-soft)] before:h-[7px] before:w-[7px] before:rounded-full before:bg-[image:var(--rv-gradient)]">
            Für wen wir bauen
          </span>
          <h2 className="mt-[22px] text-[clamp(1.9rem,3.6vw,2.7rem)] leading-[1.12] font-bold tracking-[-0.025em] text-[var(--rv-ink)]">
            Gebaut für alle, die
            <br />
            <span className="rv-gradient-text">selbst besetzen.</span>
          </h2>
          <p className="mx-auto mt-[18px] max-w-[540px] text-[clamp(1rem,1.25vw,1.12rem)] leading-[1.65] text-[var(--rv-muted)]">
            Revetly ersetzt keine Personalabteilung. Es nimmt die Arbeit ab, die vor dem
            ersten Gespräch liegt.
          </p>
        </div>

        <div className="mt-[52px] grid grid-cols-1 gap-5 md:grid-cols-3">
          {SEGMENTE.map((s, i) => (
            <RvCard
              key={s.label}
              tilt
              spotlight
              className={`reveal s${i + 1} flex flex-col p-[30px_28px]`}
              data-dir={i === 0 ? "left" : i === 2 ? "right" : "scale"}
            >
              <div className="mb-[18px] flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--rv-ink)] text-white">
                <s.icon className="h-5 w-5" strokeWidth={2.1} />
              </div>
              <span className="text-[.71rem] font-bold tracking-[.08em] text-[var(--rv-green-deep)] uppercase">
                {s.label}
              </span>
              <h3 className="mt-2.5 text-[1.12rem] leading-[1.35] font-bold tracking-[-0.02em] text-[var(--rv-ink)]">
                {s.title}
              </h3>
              <p className="mt-3 text-[.9rem] leading-[1.62] text-[var(--rv-muted)]">{s.text}</p>
            </RvCard>
          ))}
        </div>
      </div>
    </section>
  )
}
