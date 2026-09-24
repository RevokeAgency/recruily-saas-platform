"use client"

import { Check } from "lucide-react"

import { useReveal } from "@/lib/hooks/useReveal"

const CHIPS = ["Fragen aus dem Lebenslauf abgeleitet", "1 bis 5 Punkte pro Antwort", "Fließt in den Match ein"]

// Reines Anschauungsbeispiel, keine echten Bewerberdaten. Die Fragen sind
// neutral formuliert, ohne Anrede, damit sie weder mit der Du-Ansprache der
// Seite kollidieren noch eine bestimmte Gesprächskultur unterstellen.
const QUESTIONS = [
  {
    source: "Lücke im Lebenslauf",
    text: "Zwischen den letzten beiden Stationen liegen acht Monate. Was ist in dieser Zeit passiert?",
    points: 4,
  },
  {
    source: "Hard Skills",
    text: "TypeScript steht im Profil, aber in keinem Projekt. Wo kam es zuletzt zum Einsatz?",
    points: 5,
  },
  {
    source: "Zusammenarbeit",
    text: "Wie wurde im letzten Team mit abgelehnten Code-Reviews umgegangen?",
    points: 4,
  },
]

const SCALE = [1, 2, 3, 4, 5]

// Durchschnitt mit deutschem Dezimalkomma, aus den Beispielwerten gerechnet
// statt hart geschrieben, damit Karte und Summe nicht auseinanderlaufen.
const AVERAGE = (QUESTIONS.reduce((sum, q) => sum + q.points, 0) / QUESTIONS.length).toLocaleString("de-DE", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export function RvInterview() {
  const ref = useReveal()

  return (
    <section id="gespraech" ref={ref} className="relative overflow-hidden bg-white py-[clamp(72px,9vw,130px)]">
      <div className="rv-patternbg" data-pattern="dots" />
      <div className="relative z-[1] mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:gap-20 lg:px-8">
        <div className="reveal" data-dir="left">
          <span className="rv-eyebrow inline-flex items-center gap-2 rounded-full border border-[rgba(12,26,22,.10)] bg-white px-3.5 py-[7px] text-[var(--rv-ink-soft)] shadow-[var(--rv-shadow-sm)] before:h-[7px] before:w-[7px] before:rounded-full before:bg-[image:var(--rv-gradient)]">
            Gesprächsleitfaden
          </span>
          <h2 className="mt-[22px] text-[clamp(1.9rem,3.6vw,2.7rem)] leading-[1.12] font-bold tracking-[-0.025em] text-[var(--rv-ink)]">
            Das Gespräch <span className="rv-gradient-text">zählt mit.</span>
          </h2>
          <p className="mt-[18px] text-[clamp(1rem,1.25vw,1.12rem)] leading-[1.65] text-[var(--rv-muted)]">
            Für jedes Gespräch erstellt Revetly einen Leitfaden, der dort nachfragt, wo der
            Lebenslauf Lücken oder offene Fragen lässt. Pro Antwort vergibst du 1 bis 5 Punkte,
            und das Ergebnis fließt in den Match ein. So wird aus dem Eindruck nach dem Gespräch
            ein Wert, den du mit den anderen Finalisten vergleichen kannst.
          </p>
          <ul className="mt-7 flex flex-wrap gap-2.5">
            {CHIPS.map((chip) => (
              <li
                key={chip}
                className="flex items-center gap-2 rounded-full border border-[rgba(12,26,22,.10)] bg-[var(--rv-mist)] px-[14px] py-[8px] text-[.82rem] font-semibold text-[var(--rv-ink-soft)]"
              >
                <Check className="h-3 w-3 flex-none text-[var(--rv-green-deep)]" strokeWidth={2.6} />
                {chip}
              </li>
            ))}
          </ul>
        </div>

        <div
          className="reveal s1 overflow-hidden rounded-[var(--rv-radius-lg)] border border-[rgba(12,26,22,.10)] bg-white shadow-[var(--rv-shadow)]"
          data-dir="right"
          aria-label="Beispiel eines Gesprächsleitfadens"
          role="figure"
        >
          <div className="flex items-center justify-between gap-4 border-b border-[rgba(12,26,22,.10)] bg-[var(--rv-mist-2)] px-[24px] py-[16px]">
            <div>
              <div className="text-[.74rem] font-semibold tracking-[.06em] text-[var(--rv-muted)] uppercase">Gesprächsleitfaden</div>
              <div className="mt-0.5 text-[.95rem] font-bold text-[var(--rv-ink)]">Frontend Dev · Erstgespräch</div>
            </div>
            <span className="rounded-full border border-[rgba(12,26,22,.12)] bg-white px-2.5 py-1 text-[.64rem] font-bold tracking-[.08em] text-[var(--rv-muted)] uppercase">
              Beispiel
            </span>
          </div>

          <ol className="flex flex-col">
            {QUESTIONS.map((q, i) => (
              <li key={q.text} className={`px-[24px] py-[18px] ${i > 0 ? "border-t border-[rgba(12,26,22,.08)]" : ""}`}>
                <span className="text-[.68rem] font-bold tracking-[.08em] text-[var(--rv-green-deep)] uppercase">{q.source}</span>
                <p className="mt-1.5 text-[.9rem] leading-[1.55] text-[var(--rv-ink-soft)]">{q.text}</p>
                <div className="mt-3 flex items-center gap-1.5" aria-label={`${q.points} von 5 Punkten`}>
                  {SCALE.map((n) => (
                    <span
                      key={n}
                      aria-hidden="true"
                      className={`flex h-7 w-7 items-center justify-center rounded-lg text-[.76rem] font-bold tabular-nums ${
                        n === q.points
                          ? "bg-[image:var(--rv-gradient)] text-[var(--rv-ink)]"
                          : "border border-[rgba(12,26,22,.10)] text-[var(--rv-muted)]"
                      }`}
                    >
                      {n}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ol>

          <div className="flex items-center justify-between gap-4 border-t border-[rgba(12,26,22,.10)] bg-[var(--rv-mist)] px-[24px] py-[14px]">
            <span className="text-[.82rem] font-semibold text-[var(--rv-ink-soft)]">Durchschnitt über alle Antworten</span>
            <b className="text-[1.05rem] font-extrabold text-[var(--rv-ink)] tabular-nums">{AVERAGE} / 5</b>
          </div>
        </div>
      </div>
    </section>
  )
}
