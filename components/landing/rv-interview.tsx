"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowRight, Check, Plus } from "lucide-react"

import { useReveal } from "@/lib/hooks/useReveal"
import { useCountUp } from "@/lib/hooks/useCountUp"
import { INTERVIEW_WEIGHT } from "@/lib/matching/screening"

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

// Die Rechnung der Karte folgt dem Produkt, nicht einer Behauptung:
//   Gesprächswert = Durchschnitt der Punkte × 20 (wie die Interview-Route)
//   Match = Analyse × (1 − Gewicht) + Gespräch × Gewicht (Trigger aus 029)
// Ändert sich INTERVIEW_WEIGHT, rechnet die Karte automatisch mit.
const ANALYSE = 72
const AVG = QUESTIONS.reduce((sum, q) => sum + q.points, 0) / QUESTIONS.length
const GESPRAECH = Math.round(AVG * 20)
const MATCH = Math.round(ANALYSE * (1 - INTERVIEW_WEIGHT) + GESPRAECH * INTERVIEW_WEIGHT)
const AVG_LABEL = AVG.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const pct = (n: number) => `${Math.round(n * 100)} %`

// Zeitplan der Karte beim Einblenden: erst werden die Punkte gesetzt, eine
// Frage nach der anderen, dann zählt der Match vom Analysewert hoch. Die
// Abstände sind bewusst ruhiger als bei UI-Rückmeldungen: Das hier erklärt,
// wie es funktioniert, und soll mitgelesen werden können.
const PICK_DELAY = (i: number) => 0.55 + i * 0.22 // Sekunden, per CSS
const COUNT_DELAY = 1350 // Millisekunden, nach dem letzten Punkt

export function RvInterview() {
  const ref = useReveal()
  const resultRef = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  const match = useCountUp(MATCH, inView, 900, ANALYSE, COUNT_DELAY)

  useEffect(() => {
    const el = resultRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setInView(true)),
      { threshold: 0.6 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

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
          {/* Untereinander statt umbrechend: Nebeneinander passten die drei nicht in
              eine Zeile und brachen eins zu zwei um. Als Spalte lesen sie sich wie
              die drei Eigenschaften, die sie sind. */}
          <ul className="mt-7 flex flex-col items-start gap-2.5">
            {CHIPS.map((chip) => (
              <li
                key={chip}
                className="flex items-center gap-2 rounded-full border border-[rgba(12,26,22,.10)] bg-[var(--rv-mist)] px-[14px] py-[8px] text-[.84rem] font-semibold text-[var(--rv-ink-soft)]"
              >
                <Check className="h-3.5 w-3.5 flex-none text-[var(--rv-green-deep)]" strokeWidth={2.6} />
                {chip}
              </li>
            ))}
          </ul>
        </div>

        <figure
          className="reveal s1 overflow-hidden rounded-[var(--rv-radius-lg)] border border-[rgba(12,26,22,.10)] bg-white shadow-[var(--rv-shadow)]"
          data-dir="right"
        >
          <figcaption className="sr-only">
            Beispiel eines Gesprächsleitfadens: drei Fragen mit {QUESTIONS.map((q) => q.points).join(", ")} von 5
            Punkten. Analyse {ANALYSE} und Gespräch {GESPRAECH} ergeben einen Match von {MATCH}.
          </figcaption>
          <div className="flex items-center justify-between gap-4 border-b border-[rgba(12,26,22,.10)] bg-[var(--rv-mist-2)] px-[24px] py-[16px]" aria-hidden="true">
            <div>
              <div className="text-[.74rem] font-semibold tracking-[.06em] text-[var(--rv-muted)] uppercase">Gesprächsleitfaden</div>
              <div className="mt-0.5 text-[.95rem] font-bold text-[var(--rv-ink)]">Frontend Dev · Erstgespräch</div>
            </div>
            <span className="rounded-full border border-[rgba(12,26,22,.12)] bg-white px-2.5 py-1 text-[.64rem] font-bold tracking-[.08em] text-[var(--rv-muted)] uppercase">
              Beispiel
            </span>
          </div>

          <ol className="flex flex-col" aria-hidden="true">
            {QUESTIONS.map((q, i) => (
              <li key={q.text} className={`px-[24px] py-[18px] ${i > 0 ? "border-t border-[rgba(12,26,22,.08)]" : ""}`}>
                <span className="text-[.68rem] font-bold tracking-[.08em] text-[var(--rv-green-deep)] uppercase">{q.source}</span>
                <p className="mt-1.5 text-[.9rem] leading-[1.55] text-[var(--rv-ink-soft)]">{q.text}</p>
                <div className="mt-3 flex items-center gap-1.5">
                  {SCALE.map((n) => (
                    <span
                      key={n}
                      className="relative flex h-7 w-7 items-center justify-center rounded-lg border border-[rgba(12,26,22,.10)] text-[.76rem] font-bold text-[var(--rv-muted)] tabular-nums"
                    >
                      {n}
                      {/* Die gewählte Punktzahl liegt als Füllung darüber und wird
                          beim Einblenden "gesetzt", eine Frage nach der anderen. */}
                      {n === q.points && (
                        <span
                          className="rv-iv-fill absolute -inset-px flex items-center justify-center rounded-lg bg-[image:var(--rv-gradient)] text-[var(--rv-ink)]"
                          style={{ ["--d" as string]: `${PICK_DELAY(i)}s` }}
                        >
                          {n}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ol>

          {/* Die Rechnung, um die es in der Sektion geht: Das Gespräch verschiebt
              den Match. Früher stand hier nur der Durchschnitt, die Kernaussage
              fehlte im Bild. */}
          <div ref={resultRef} className="border-t border-[rgba(12,26,22,.10)] bg-[var(--rv-mist)] px-[24px] pt-[16px] pb-[14px]" aria-hidden="true">
            {/* Als Gleichung gesetzt: Die Glieder stehen dicht beieinander, das
                Ergebnis rückt nach rechts. Im Raster mit gleich breiten Spalten
                zerfiel die Rechnung in fünf lose Werte. */}
            <div className="flex items-end gap-3">
              <Term label="Analyse" value={String(ANALYSE)} />
              <Plus className="mb-[5px] h-3.5 w-3.5 flex-none text-[var(--rv-muted)]" strokeWidth={2.4} />
              <Term label="Gespräch" value={String(GESPRAECH)} note={`Ø ${AVG_LABEL} von 5`} />
              <div className="ml-auto flex items-end gap-3">
                <ArrowRight className="mb-[9px] h-3.5 w-3.5 flex-none text-[var(--rv-muted)]" strokeWidth={2.4} />
                <div className="text-right">
                  <div className="text-[.68rem] font-bold tracking-[.08em] text-[var(--rv-green-deep)] uppercase">Match</div>
                  <div className="rv-gradient-text text-[1.9rem] leading-none font-extrabold tracking-[-0.04em] tabular-nums">{match}</div>
                </div>
              </div>
            </div>
            <p className="mt-2.5 text-[.74rem] text-[var(--rv-muted)]">
              {pct(1 - INTERVIEW_WEIGHT)} Analyse, {pct(INTERVIEW_WEIGHT)} Gespräch
            </p>
          </div>
        </figure>
      </div>
    </section>
  )
}

function Term({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <div className="text-[.68rem] font-bold tracking-[.08em] text-[var(--rv-muted)] uppercase">{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[1.35rem] leading-none font-extrabold tracking-[-0.03em] text-[var(--rv-ink)] tabular-nums">{value}</span>
        {note && <span className="text-[.7rem] text-[var(--rv-muted)] tabular-nums">{note}</span>}
      </div>
    </div>
  )
}
