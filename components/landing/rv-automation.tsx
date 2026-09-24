"use client"

import { CalendarCheck, MailCheck, Users } from "lucide-react"

import { useReveal } from "@/lib/hooks/useReveal"
import { RvCard } from "./rv-card"

const CARDS = [
  {
    icon: MailCheck,
    title: "Absagen.",
    text: "Persönlich formuliert und auf Knopfdruck verschickt. Niemand wartet wochenlang.",
  },
  {
    icon: CalendarCheck,
    title: "Terminbuchung.",
    text: "Bewerber sehen deine freien Zeiten und buchen selbst. Der Termin landet mit Videolink in deinem Google- oder Microsoft-Kalender.",
  },
  {
    icon: Users,
    title: "Talent-Pool.",
    text: "Neue Stellen gleicht Revetly gegen frühere Bewerber ab. Wer letztes Mal knapp nicht gepasst hat, taucht von selbst wieder auf.",
  },
]

export function RvAutomation() {
  const ref = useReveal()

  return (
    <section id="automatisch" ref={ref} className="relative overflow-hidden bg-[var(--rv-mist)] py-[clamp(72px,9vw,130px)]">
      <div className="rv-patternbg" data-pattern="diagonal" />
      <div className="relative z-[1] mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="reveal max-w-[660px]" data-dir="left">
          <span className="rv-eyebrow inline-flex items-center gap-2 rounded-full border border-[rgba(12,26,22,.10)] bg-white px-3.5 py-[7px] text-[var(--rv-ink-soft)] shadow-[var(--rv-shadow-sm)] before:h-[7px] before:w-[7px] before:rounded-full before:bg-[image:var(--rv-gradient)]">
            Automatisch
          </span>
          <h2 className="mt-[22px] text-[clamp(1.9rem,3.6vw,2.7rem)] leading-[1.12] font-bold tracking-[-0.025em] text-[var(--rv-ink)]">
            Der Rest läuft <span className="rv-gradient-text">nebenher.</span>
          </h2>
        </div>

        <div className="mt-11 grid grid-cols-1 gap-5 md:grid-cols-3">
          {CARDS.map((card, i) => (
            <RvCard
              key={card.title}
              tilt
              spotlight
              className={`reveal flex flex-col p-[30px_28px] ${i > 0 ? `s${i + 1}` : ""}`}
              data-dir={i === 0 ? "left" : i === 2 ? "right" : "scale"}
            >
              <div className="mb-[18px] flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--rv-ink)] text-white">
                <card.icon className="h-5 w-5" strokeWidth={2.1} />
              </div>
              <h3 className="text-[1.12rem] font-bold tracking-[-0.02em] text-[var(--rv-ink)]">{card.title}</h3>
              <p className="mt-2.5 text-[.92rem] leading-[1.62] text-[var(--rv-muted)]">{card.text}</p>
            </RvCard>
          ))}
        </div>

        <p className="reveal s4 mt-5 rounded-[var(--rv-radius)] border border-[rgba(12,26,22,.10)] bg-white p-[20px_24px] text-[clamp(.95rem,1.2vw,1.05rem)] leading-[1.65] text-[var(--rv-ink-soft)] shadow-[var(--rv-shadow-sm)]">
          Auch deine Bewerber merken den Unterschied: eine schnelle Antwort, eine klare Absage,
          ein Termin nach Wahl. Und die Guten sind noch da, wenn du dich entscheidest.
        </p>
      </div>
    </section>
  )
}
