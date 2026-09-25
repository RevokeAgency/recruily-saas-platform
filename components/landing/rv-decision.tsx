"use client"

import { Fragment } from "react"

import { useReveal } from "@/lib/hooks/useReveal"

// Überschrift als Einzelwörter, damit sie beim Scrollen so einblendet wie die
// Hero-Headline. Das ist Absicht: Die These der Seite ("die Entscheidung
// triffst du") greift den Seitenanfang wieder auf.
const LINES: Array<Array<{ text: string; gradient?: boolean }>> = [
  [{ text: "Revetly" }, { text: "sortiert." }],
  [{ text: "Du", gradient: true }, { text: "entscheidest.", gradient: true }],
]

/**
 * Ruhiges, typografisch getragenes Band zwischen den Produktsektionen.
 *
 * Bewusst ohne Karten, Icons oder Muster: Die Aussage ist die Arbeitsteilung
 * zwischen Revetly und dem Menschen, und die trägt sich über die Schrift.
 *
 * Der Grund ist das Petrol aus der Scrim des Heros (rgba(16,44,41)), nicht
 * reines Schwarz. So gehört das Band erkennbar zur Welt des Seitenanfangs und
 * hebt sich von der schwarzen Datenschutz-Karte weiter unten ab.
 */
export function RvDecision() {
  const ref = useReveal()
  let word = 0

  return (
    <section
      id="entscheidung"
      ref={ref}
      className="relative overflow-hidden py-[clamp(80px,10vw,140px)]"
      style={{
        background:
          "radial-gradient(80% 120% at 0% 0%, rgba(22,199,124,.16), transparent 55%), radial-gradient(70% 90% at 100% 100%, rgba(34,193,238,.10), transparent 60%), linear-gradient(165deg, #173d38 0%, #102c29 55%, #0c1f1c 100%)",
      }}
    >
      <div className="relative z-[1] mx-auto grid max-w-[1200px] grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20 lg:px-8">
        <h2 className="reveal rv-words text-[clamp(2.2rem,4.6vw,3.5rem)] leading-[1.06] font-bold tracking-[-0.03em] text-white">
          {LINES.map((line, li) => (
            <Fragment key={li}>
              {line.map((w, wi) => (
                <Fragment key={wi}>
                  <span
                    className={`rv-w ${w.gradient ? "rv-gradient-text" : ""}`}
                    style={{ ["--d" as string]: `${0.05 + word++ * 0.08}s` }}
                  >
                    {w.text}
                  </span>
                  {wi < line.length - 1 && " "}
                </Fragment>
              ))}
              {li < LINES.length - 1 && <br />}
            </Fragment>
          ))}
        </h2>
        <div className="reveal s2 flex flex-col gap-6 lg:pt-2" data-dir="right">
          <p className="text-[clamp(1.02rem,1.45vw,1.2rem)] leading-[1.7] text-white/88">
            Revetly nimmt dir das Lesen, Sortieren und Organisieren ab. Wen du einstellst,
            entscheidest immer du. Jeder Schritt bis dahin ist festgehalten: auf welchem Beleg
            ein Match beruht, wie das Gespräch lief, wer am Ende die Wahl getroffen hat.
          </p>
          {/* 66 statt 58 Prozent Deckkraft: Auf dem dunklen Grund war der zweite
              Absatz vorher zu blass, um ihn bequem zu lesen. */}
          <p className="border-t border-white/12 pt-6 text-[clamp(.95rem,1.2vw,1.05rem)] leading-[1.7] text-white/66">
            Ist die Entscheidung gefallen, übernimmt dein HR-System. Revetly deckt die Auswahl
            ab, dein HR-System die Verwaltung deiner Mitarbeiter. Übertragen wird nur, wer
            eingestellt ist.
          </p>
        </div>
      </div>
    </section>
  )
}
