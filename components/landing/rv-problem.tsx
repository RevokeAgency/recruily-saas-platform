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
//
// `rot` ist die Endneigung des Blatts, `dx` die horizontale Verschiebung im
// zusammengeschobenen Zustand, `from`/`to` der Scrollbereich, in dem das Blatt
// an seinen Platz faellt. Die leicht versetzten Bereiche ergeben die Staffelung.
const PAINS = [
  {
    icon: Layers,
    title: "Sortiert wird nach Gefühl",
    text: "Nach der zehnten Bewerbung verschwimmen die Profile. Wer oben im Stapel liegt, wird gelesen, der Rest überflogen. Warum jemand aussortiert wurde, lässt sich hinterher kaum noch sagen.",
    rot: "-2.4deg",
    ty: "0px",
    dx: "86px",
    from: "6%",
    to: "30%",
  },
  {
    icon: MailWarning,
    title: "Absagen bleiben liegen",
    text: "Rückmeldungen kosten Zeit, die niemand übrig hat, und Freude macht diese Aufgabe ohnehin keinem. Also warten Kandidaten wochenlang und erzählen weiter, wie das gelaufen ist.",
    rot: "1.6deg",
    ty: "18px",
    dx: "0px",
    from: "10%",
    to: "34%",
  },
  {
    icon: CalendarClock,
    title: "Ein Termin kostet fünf E-Mails",
    text: "Bis ein Gespräch im Kalender steht, ist die Terminfrage mehrfach hin und her gegangen. In dieser Woche hat der interessanteste Kandidat oft schon woanders zugesagt.",
    rot: "-1.2deg",
    ty: "-8px",
    dx: "-86px",
    from: "14%",
    to: "38%",
  },
]

// Leere Blaetter hinter den drei Karten. Sie machen aus drei Karten einen
// Stapel und kommen frueher zur Ruhe, weil sie schon dalagen.
//
// Sie ragen bewusst ueber die Textspalte hinaus, sonst liegen sie vollstaendig
// hinter den Karten und sind nicht zu sehen. Die Sektion beschneidet am
// Viewport-Rand, der Ueberstand faellt also nirgends auf.
const GHOSTS = [
  { className: "left-[-72px] top-[-20px] h-[76%] w-[236px]", rot: "-11deg", ty: "0px", dx: "80px", from: "2%", to: "26%" },
  { className: "right-[-58px] top-[30px] h-[68%] w-[212px]", rot: "9deg", ty: "0px", dx: "-70px", from: "4%", to: "28%" },
]

type Sheet = { rot: string; ty: string; dx: string; from: string; to: string }
type SheetVars = React.CSSProperties & Record<"--rot" | "--ty" | "--dx" | "--fan-from" | "--fan-to", string>

function sheetVars(s: Sheet): SheetVars {
  return { "--rot": s.rot, "--ty": s.ty, "--dx": s.dx, "--fan-from": s.from, "--fan-to": s.to } as SheetVars
}

/**
 * Problem-Abschnitt zwischen Hero und Features: benennt die Ausgangslage,
 * bevor die folgenden Abschnitte die Lösung erklären.
 *
 * Signature der Sektion ist der Stapel selbst. Die Überschrift sagt, dass der
 * passende Kandidat auf Seite vier liegt, also zeigt der Abschnitt genau das:
 * einen Papierstapel, der sich beim Scrollen auffächert. Das Motiv stammt aus
 * dem Hero, wo dieselben Blätter mit denselben angedeuteten Textzeilen fliegen.
 *
 * Bewusst keine Sticky-Spalte und keine dunklen Icon-Kacheln: Features direkt
 * darunter nutzt genau dieses Muster.
 */
export function RvProblem() {
  const ref = useReveal()

  return (
    // `overflow-clip` statt `overflow-hidden`: `hidden` macht die Sektion zu
    // einem Scroll-Container, und `view()` bindet seine Timeline an den
    // naechsten Scroll-Container. Da diese Sektion selbst nie scrollt, stuende
    // der Fortschritt fest. `clip` beschneidet genauso, ohne Scroll-Container
    // zu sein, womit die Timeline wieder am Dokument haengt.
    <section ref={ref} className="relative overflow-clip bg-[var(--rv-mist)] py-[clamp(72px,9vw,130px)]">
      <div className="rv-patternbg" data-pattern="diagonal" />
      <div className="relative z-[1] mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="reveal mx-auto max-w-[680px] text-center" data-dir="scale">
          <span className="rv-eyebrow inline-flex items-center gap-2 rounded-full border border-[rgba(12,26,22,.10)] bg-white px-3.5 py-[7px] text-[var(--rv-ink-soft)] shadow-[var(--rv-shadow-sm)] before:h-[7px] before:w-[7px] before:rounded-full before:bg-[image:var(--rv-gradient)]">
            Kennst du das?
          </span>
          {/* `text-balance` statt festem <br>: die Zeile bricht sonst nach
              "Seite" und laesst "vier." allein stehen. */}
          <h2 className="mt-[22px] text-[clamp(1.9rem,3.6vw,2.7rem)] leading-[1.12] font-bold tracking-[-0.025em] text-balance text-[var(--rv-ink)]">
            Der passende Kandidat liegt auf{" "}
            <span className="rv-gradient-text">Seite vier.</span>
          </h2>
          <p className="mx-auto mt-[18px] max-w-[560px] text-[clamp(1rem,1.25vw,1.12rem)] leading-[1.65] text-[var(--rv-muted)]">
            Bei jeder Ausschreibung stapeln sich Bewerbungen, die alle irgendwie passen
            könnten. Weil die Zeit fehlt, entscheidet am Ende die Reihenfolge im
            Posteingang statt der Eignung.
          </p>
        </div>

        <div className="relative mt-[clamp(48px,6vw,76px)]">
          {GHOSTS.map((g) => (
            <div
              key={g.className}
              aria-hidden="true"
              className={`pointer-events-none absolute hidden lg:block ${g.className}`}
              style={sheetVars(g)}
            >
              <div className="rv-sheet-fan h-full w-full">
                <div className="rv-sheet-ghost relative h-full w-full rounded-[14px] opacity-70 shadow-[var(--rv-shadow-sm)]" />
              </div>
            </div>
          ))}

          <div className="relative grid grid-cols-1 gap-5 lg:grid-cols-3">
            {PAINS.map((pain) => (
              <div key={pain.title} className="rv-sheet" style={sheetVars(pain)}>
                <div className="rv-sheet-fan h-full">
                  <div className="rv-sheet-card h-full rounded-[var(--rv-radius)] border border-[rgba(12,26,22,.10)] bg-white p-[30px_28px] shadow-[var(--rv-shadow-sm)]">
                    <pain.icon className="h-[22px] w-[22px] text-[var(--rv-green-deep)]" strokeWidth={1.9} />
                    <h3 className="mt-[18px] text-[1.12rem] leading-[1.35] font-bold tracking-[-0.02em] text-[var(--rv-ink)]">
                      {pain.title}
                    </h3>
                    <p className="mt-2.5 text-[.92rem] leading-[1.65] text-[var(--rv-muted)]">{pain.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
