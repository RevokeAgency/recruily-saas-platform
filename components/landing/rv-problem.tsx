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
 *
 * Komposition bewusst anders als bei den Nachbarn: durchgehende Zeilen über
 * die volle Breite statt Karten, ohne die Sticky-Spalte und ohne die dunklen
 * Icon-Kacheln. Features direkt darunter nutzt genau dieses Muster, und zwei
 * gleich gebaute Abschnitte hintereinander lesen sich wie ein Duplikat.
 */
export function RvProblem() {
  const ref = useReveal()

  return (
    <section ref={ref} className="relative overflow-hidden bg-[var(--rv-mist)] py-[clamp(72px,9vw,130px)]">
      <div className="rv-patternbg" data-pattern="diagonal" />
      <div className="relative z-[1] mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="reveal max-w-[760px]">
          <span className="rv-eyebrow inline-flex items-center gap-2 rounded-full border border-[rgba(12,26,22,.10)] bg-white px-3.5 py-[7px] text-[var(--rv-ink-soft)] shadow-[var(--rv-shadow-sm)] before:h-[7px] before:w-[7px] before:rounded-full before:bg-[image:var(--rv-gradient)]">
            Kennst du das?
          </span>
          {/* `text-balance` statt festem <br>: die Zeile bricht sonst nach
              "Seite" und laesst "vier." allein stehen. */}
          <h2 className="mt-[22px] text-[clamp(1.9rem,3.6vw,2.7rem)] leading-[1.12] font-bold tracking-[-0.025em] text-balance text-[var(--rv-ink)]">
            Der passende Kandidat liegt auf{" "}
            <span className="rv-gradient-text">Seite vier.</span>
          </h2>
          <p className="mt-[18px] max-w-[560px] text-[clamp(1rem,1.25vw,1.12rem)] leading-[1.65] text-[var(--rv-muted)]">
            Bei jeder Ausschreibung stapeln sich Bewerbungen, die alle irgendwie passen
            könnten. Weil die Zeit fehlt, entscheidet am Ende die Reihenfolge im
            Posteingang statt der Eignung.
          </p>
        </div>

        <div className="mt-[clamp(44px,5vw,64px)] border-b border-[rgba(12,26,22,.12)]">
          {PAINS.map((pain, i) => (
            <div
              key={pain.title}
              className={`reveal grid grid-cols-1 items-baseline gap-x-10 gap-y-3 border-t border-[rgba(12,26,22,.12)] py-7 lg:grid-cols-[minmax(0,6fr)_minmax(0,10fr)] lg:py-[34px] ${i > 0 ? `s${i}` : ""}`}
            >
              <h3 className="flex items-center gap-3 text-[clamp(1.08rem,1.5vw,1.28rem)] leading-[1.3] font-bold tracking-[-0.02em] text-[var(--rv-ink)]">
                <pain.icon className="h-[19px] w-[19px] flex-none text-[var(--rv-green-deep)]" strokeWidth={2} />
                {pain.title}
              </h3>
              <p className="text-[.95rem] leading-[1.68] text-[var(--rv-muted)]">{pain.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
