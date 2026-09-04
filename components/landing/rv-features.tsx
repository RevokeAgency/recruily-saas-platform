"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowUpRight, ClipboardList, ListOrdered, MailCheck, Users } from "lucide-react"

import { useReveal } from "@/lib/hooks/useReveal"
import { RvCard } from "./rv-card"

const STEPS = [
  "Vorsortiert im Posteingang",
  "Interviewleitfaden inklusive",
  "Absagen und Termine automatisch",
  "Talent-Pool arbeitet weiter",
]

const CARDS = [
  {
    icon: ListOrdered,
    badge: "Tempo",
    title: "Vorsortiert, bevor du reinschaust",
    text: "Jede eingehende Bewerbung wird automatisch gematcht und einsortiert. Du öffnest ein Ranking mit den stärksten Profilen oben, keinen Stapel, den erst jemand durchsehen muss.",
  },
  {
    icon: ClipboardList,
    badge: "Interview",
    title: "Maßgeschneiderter Interviewleitfaden",
    text: "Revetly analysiert Stärken und Lebenslauflücken des Bewerbers und generiert dir sofort passende, gezielte Fragen für das Bewerbergespräch.",
  },
  {
    icon: MailCheck,
    badge: "Automatisch",
    title: "Der Rest läuft nebenher",
    text: "Personalisierte Absagen gehen automatisch raus, Termine buchen Bewerber selbst in deinem Kalender. Kein Nachfassen, kein Hin und Her per Mail.",
  },
  {
    icon: Users,
    badge: "Talent-Pool",
    title: "Kein Kandidat versandet",
    text: "Neue Stellen gleicht Revetly automatisch gegen deinen bestehenden Pool ab. Wer beim letzten Mal knapp nicht gepasst hat, taucht von selbst wieder auf.",
  },
]

export function RvFeatures() {
  const ref = useReveal()
  const [active, setActive] = useState(0)

  useEffect(() => {
    const cards = Array.from(document.querySelectorAll<HTMLElement>("[data-feat-card]"))
    if (!cards.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(Number((entry.target as HTMLElement).dataset.featCard))
          }
        })
      },
      { threshold: 0.45, rootMargin: "-5% 0px -30% 0px" },
    )
    cards.forEach((c) => observer.observe(c))
    return () => observer.disconnect()
  }, [])

  return (
    <section id="features" ref={ref} className="relative bg-white py-[clamp(72px,9vw,130px)]">
      <div className="rv-patternbg" data-pattern="dots" />
      <div className="relative z-[1] mx-auto grid max-w-[1200px] grid-cols-1 gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-[110px] lg:px-8">
        <div className="reveal lg:sticky lg:top-[110px] lg:self-start" data-dir="left">
          <div className="rv-arrowbox mb-[22px]">
            <ArrowUpRight className="h-[18px] w-[18px]" strokeWidth={2.4} />
          </div>
          <h2 className="text-[clamp(1.9rem,3.6vw,2.7rem)] leading-[1.12] font-bold tracking-[-0.025em] text-[var(--rv-ink)]">
            Weniger Zeit im Posteingang,
            <br />
            <span className="rv-gradient-text">mehr im Gespräch.</span>
          </h2>
          <p className="mt-4 text-[clamp(1rem,1.25vw,1.12rem)] leading-[1.65] text-[var(--rv-muted)]">
            Revetly nimmt dir die Vorauswahl und den Papierkram ab. Übrig bleibt die Arbeit, für die es dich wirklich braucht: das Gespräch.
          </p>
          <p className="mt-4 rounded-2xl border border-[rgba(12,26,22,.10)] bg-[var(--rv-mist)] p-[14px_16px] text-[.88rem] leading-[1.6] text-[var(--rv-muted)]">
            Und trotzdem nachvollziehbar: Jeder Match-Score ist mit der Stelle aus den Unterlagen belegt, eine zweite Instanz prüft gegen, und eine fehlende Qualifikation deckelt den Score. Schnell heißt hier nicht oberflächlich.
          </p>
          <nav className="mt-9 hidden lg:block" aria-label="Features">
            {STEPS.map((label, i) => (
              <div key={label} className={`rv-feat-step flex items-center gap-3.5 py-3.5 ${active === i ? "active" : ""}`}>
                <span
                  className={`w-[22px] flex-none text-[.7rem] font-bold tracking-[.06em] text-[var(--rv-green-deep)] transition-opacity duration-300 tabular-nums ${active === i ? "opacity-100" : "opacity-0"}`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className={`text-[.88rem] font-semibold transition-colors duration-300 ${active === i ? "text-[var(--rv-ink)]" : "text-[var(--rv-ink-soft)]"}`}>
                  {label}
                </span>
                <span className="rv-feat-bar ml-auto h-0.5 flex-none rounded-full bg-[image:var(--rv-gradient)]" />
              </div>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-[18px]">
          {CARDS.map((card, i) => (
            <RvCard
              key={card.title}
              tilt
              spotlight
              data-feat-card={i}
              className={`reveal p-9 ${i > 0 ? `s${Math.min(i, 5)}` : ""}`}
              data-dir="right"
            >
              <div className="mb-[22px] flex items-center justify-between">
                <div className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-[13px] bg-[var(--rv-ink)] text-white">
                  <card.icon className="h-[22px] w-[22px]" strokeWidth={1.9} />
                </div>
                <span className="rounded-full bg-[rgba(22,199,124,.12)] px-[10px] py-1 text-[.68rem] font-bold tracking-[.08em] text-[var(--rv-green-deep)] uppercase">
                  {card.badge}
                </span>
              </div>
              <h3 className="mb-2.5 text-[1.15rem] font-bold tracking-[-0.02em] text-[var(--rv-ink)]">{card.title}</h3>
              <p className="text-[.92rem] leading-[1.65] text-[var(--rv-muted)]">{card.text}</p>
            </RvCard>
          ))}
        </div>
      </div>
    </section>
  )
}
