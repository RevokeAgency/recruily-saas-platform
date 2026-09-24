"use client"

import { useReveal } from "@/lib/hooks/useReveal"

/**
 * Ruhiges, typografisch getragenes Band zwischen den Produktsektionen.
 *
 * Bewusst ohne Karten, Icons oder Muster: Die Aussage ist die Arbeitsteilung
 * zwischen Revetly und dem Menschen, und die trägt sich über die Schrift.
 * Der dunkle Grund setzt einen klaren Einschnitt zwischen der hellen
 * Gesprächs-Sektion davor und der Automations-Sektion danach.
 */
export function RvDecision() {
  const ref = useReveal()

  return (
    <section id="entscheidung" ref={ref} className="relative overflow-hidden bg-[var(--rv-ink)] py-[clamp(80px,10vw,140px)]">
      <div className="relative z-[1] mx-auto grid max-w-[1200px] grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20 lg:px-8">
        <h2 className="reveal text-[clamp(2.2rem,4.6vw,3.5rem)] leading-[1.06] font-bold tracking-[-0.03em] text-white" data-dir="left">
          Revetly sortiert.
          <br />
          <span className="rv-gradient-text">Du entscheidest.</span>
        </h2>
        <div className="reveal s1 flex flex-col gap-6 lg:pt-2" data-dir="right">
          <p className="text-[clamp(1.02rem,1.45vw,1.2rem)] leading-[1.7] text-white/86">
            Revetly nimmt dir das Lesen, Sortieren und Organisieren ab. Wen du einstellst,
            entscheidest immer du. Jeder Schritt bis dahin ist festgehalten: auf welchem Beleg
            ein Match beruht, wie das Gespräch lief, wer am Ende die Wahl getroffen hat.
          </p>
          <p className="border-t border-white/12 pt-6 text-[clamp(.95rem,1.2vw,1.05rem)] leading-[1.7] text-white/58">
            Ist die Entscheidung gefallen, übernimmt dein HR-System. Revetly deckt die Auswahl
            ab, dein HR-System die Verwaltung deiner Mitarbeiter. Übertragen wird nur, wer
            eingestellt ist.
          </p>
        </div>
      </div>
    </section>
  )
}
