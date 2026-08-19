"use client"

import { CalendarClock, Layers, MailWarning } from "lucide-react"

import { useReveal } from "@/lib/hooks/useReveal"

// Die Seite sprang bisher vom Hero direkt zur Erklaerung des Scores. Damit
// fehlte der Schritt, in dem sich der Leser wiedererkennt, bevor er die
// Loesung bewertet.
//
// Bewusst ohne Zahlen: Angaben wie "Recruiter verbringen X Stunden pro Woche"
// haben wir nicht erhoben und duerfen sie deshalb nicht behaupten. Die
// Wiedererkennung tragen die Situationen selbst.
const PAINS = [
  {
    icon: Layers,
    title: "Sortiert wird nach Gefühl",
    text: "Nach der zehnten Bewerbung verschwimmen die Profile. Wer oben im Stapel liegt, wird gelesen, der Rest überflogen. Warum jemand aussortiert wurde, lässt sich hinterher kaum noch sagen.",
  },
  {
    icon: MailWarning,
    title: "Absagen bleiben liegen",
    text: "Rückmeldungen kosten Zeit, die niemand übrig hat, und Freude macht diese Aufgabe ohnehin keinem. Also warten Kandidaten wochenlang und erzählen weiter, wie das gelaufen ist.",
  },
  {
    icon: CalendarClock,
    title: "Ein Termin kostet fünf E-Mails",
    text: "Bis ein Gespräch im Kalender steht, ist die Terminfrage mehrfach hin und her gegangen. In dieser Woche hat der interessanteste Kandidat oft schon woanders zugesagt.",
  },
]

/**
 * Problem-Abschnitt zwischen Hero und Features: benennt die Ausgangslage,
 * bevor die folgenden Abschnitte die Lösung erklären.
 */
export function RvProblem() {
  const ref = useReveal()

  return (
    <section ref={ref} className="relative overflow-hidden bg-[var(--rv-mist)] py-[clamp(72px,9vw,130px)]">
      <div className="rv-patternbg" data-pattern="diagonal" />
      <div className="relative z-[1] mx-auto grid max-w-[1200px] grid-cols-1 gap-12 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-[90px] lg:px-8">
        <div className="reveal lg:sticky lg:top-[110px] lg:self-start" data-dir="left">
          <span className="rv-eyebrow inline-flex items-center gap-2 rounded-full border border-[rgba(12,26,22,.10)] bg-white px-3.5 py-[7px] text-[var(--rv-ink-soft)] shadow-[var(--rv-shadow-sm)] before:h-[7px] before:w-[7px] before:rounded-full before:bg-[image:var(--rv-gradient)]">
            Kennst du das?
          </span>
          <h2 className="mt-[22px] text-[clamp(1.9rem,3.6vw,2.7rem)] leading-[1.12] font-bold tracking-[-0.025em] text-[var(--rv-ink)]">
            Der passende Kandidat
            <br />
            <span className="rv-gradient-text">liegt auf Seite vier.</span>
          </h2>
          <p className="mt-[18px] max-w-[420px] text-[clamp(1rem,1.25vw,1.12rem)] leading-[1.65] text-[var(--rv-muted)]">
            Bei jeder Ausschreibung stapeln sich Bewerbungen, die alle irgendwie passen
            könnten. Weil die Zeit fehlt, entscheidet am Ende die Reihenfolge im
            Posteingang statt der Eignung.
          </p>
        </div>

        <div className="flex flex-col">
          {PAINS.map((pain, i) => (
            <div
              key={pain.title}
              className={`reveal flex gap-5 border-t border-[rgba(12,26,22,.10)] py-8 first:border-t-0 first:pt-0 ${i > 0 ? `s${i}` : ""}`}
              data-dir="right"
            >
              <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-[rgba(12,26,22,.10)] bg-white text-[var(--rv-ink-soft)] shadow-[var(--rv-shadow-sm)]">
                <pain.icon className="h-5 w-5" strokeWidth={1.9} />
              </div>
              <div>
                <h3 className="text-[1.12rem] leading-[1.35] font-bold tracking-[-0.02em] text-[var(--rv-ink)]">
                  {pain.title}
                </h3>
                <p className="mt-2.5 max-w-[520px] text-[.93rem] leading-[1.62] text-[var(--rv-muted)]">
                  {pain.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
