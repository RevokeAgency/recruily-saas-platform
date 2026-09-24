"use client"

import { Briefcase, Building2, Store } from "lucide-react"

import { useReveal } from "@/lib/hooks/useReveal"
import { RvCard } from "./rv-card"

// Früher stand an dieser Stelle eine Kundenstimmen-Sektion mit erfundenen
// Zitaten. Erfundene Referenzen sind in Österreich und der EU unlautere
// Werbung (UWG-Anhang, Richtlinie 2005/29/EG). Solange es keine echten gibt,
// steht hier, für wen Revetly gebaut ist.
//
// Die Segmente sind nach der Größe des Stapels pro Stelle geschnitten, nicht
// nach Unternehmensgröße. Das ist der eigentliche Auslöser für den Bedarf.
const SEGMENTE = [
  {
    icon: Briefcase,
    title: "Personaldienstleister und Recruiter.",
    text: "Viele Mandate gleichzeitig, jede Woche neue Stellen. Revetly gleicht jedes neue Mandat gegen deinen bestehenden Pool ab, bevor du neu suchst.",
  },
  {
    icon: Building2,
    title: "Unternehmen mit vielen offenen Stellen.",
    text: "Jede Stelle bekommt ihre eigene Bewerbungsseite und ihr eigenes Ranking. Du behältst den Überblick, auch wenn zwanzig Stellen gleichzeitig laufen.",
  },
  {
    icon: Store,
    title: "Betriebe mit einer Stelle und vollem Posteingang.",
    text: "Eine Anzeige, sechzig Bewerbungen, keine Personalabteilung. Revetly sortiert, du führst die Gespräche.",
  },
]

export function RvAudience() {
  const ref = useReveal()

  return (
    <section id="zielgruppen" ref={ref} className="relative overflow-hidden bg-white py-[clamp(72px,9vw,130px)]">
      <div className="rv-patternbg" data-pattern="grid" />
      <div className="relative z-[1] mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="reveal mx-auto max-w-[680px] text-center" data-dir="scale">
          <span className="rv-eyebrow inline-flex items-center gap-2 rounded-full border border-[rgba(12,26,22,.10)] bg-white px-3.5 py-[7px] text-[var(--rv-ink-soft)] shadow-[var(--rv-shadow-sm)] before:h-[7px] before:w-[7px] before:rounded-full before:bg-[image:var(--rv-gradient)]">
            Für wen wir bauen
          </span>
          <h2 className="mt-[22px] text-[clamp(1.9rem,3.6vw,2.7rem)] leading-[1.12] font-bold tracking-[-0.025em] text-balance text-[var(--rv-ink)]">
            Für alle, die mehr Bewerbungen bekommen, <span className="rv-gradient-text">als sie lesen können.</span>
          </h2>
          <p className="mx-auto mt-[18px] max-w-[540px] text-[clamp(1rem,1.25vw,1.12rem)] leading-[1.65] text-[var(--rv-muted)]">
            Entscheidend ist nicht die Größe deines Unternehmens, sondern der Stapel pro Stelle.
          </p>
        </div>

        <div className="mt-[52px] grid grid-cols-1 gap-5 md:grid-cols-3">
          {SEGMENTE.map((s, i) => (
            <RvCard
              key={s.title}
              tilt
              spotlight
              className={`reveal s${i + 1} flex flex-col p-[30px_28px]`}
              data-dir={i === 0 ? "left" : i === 2 ? "right" : "scale"}
            >
              <div className="mb-[18px] flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--rv-ink)] text-white">
                <s.icon className="h-5 w-5" strokeWidth={2.1} />
              </div>
              <h3 className="text-[1.12rem] leading-[1.35] font-bold tracking-[-0.02em] text-[var(--rv-ink)]">{s.title}</h3>
              <p className="mt-3 text-[.9rem] leading-[1.62] text-[var(--rv-muted)]">{s.text}</p>
            </RvCard>
          ))}
        </div>
      </div>
    </section>
  )
}
