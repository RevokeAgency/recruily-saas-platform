import Link from "next/link"

import { useReveal } from "@/lib/hooks/useReveal"
import { RvButton } from "./rv-button"
import { PLANS } from "@/lib/plans"

const STEPS = [
  {
    title: "Stelle anlegen",
    text: "Du fügst den Link deiner Stellenanzeige ein, und Revetly liest Aufgaben und Anforderungen selbst heraus. Was zwingend erfüllt sein muss, etwa eine Pflichtsprache oder eine Berufszulassung, legst du als K.O.-Kriterium dazu.",
  },
  {
    title: "Bewerbungen sammeln",
    text: "Bewerbungen erreichen dich über deinen Apply-Link, per E-Mail an die Stellenadresse oder als Upload aus deinem Postfach. Lebenslauf und Anschreiben werden zusammen gelesen, auch wenn das PDF nur ein Scan ist.",
  },
  {
    title: "Shortlist lesen",
    text: "Statt eines Stapels bekommst du eine Rangfolge, in der jede Ebene begründet und mit einer Stelle aus den Unterlagen belegt ist. Wem die geforderte Zulassung fehlt, der steht unten, so gut der Rest auch aussieht.",
  },
  {
    title: "Termin buchen lassen",
    text: "Der Bewerber sucht sich eine deiner freien Zeiten selbst aus, und der Termin landet mit Videolink direkt in deinem Google- oder Microsoft-Kalender. Das Hin und Her per Mail entfällt.",
  },
]

export function RvHowItWorks() {
  const ref = useReveal()

  return (
    <section id="how" ref={ref} className="relative overflow-hidden bg-[image:var(--rv-gradient)] py-[clamp(72px,9vw,130px)]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(130% 90% at 100% 0%, rgba(255,255,255,.30), transparent 45%), radial-gradient(120% 90% at 0% 100%, rgba(255,255,255,.18), transparent 45%)",
        }}
      />
      <div className="relative z-[1] mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="reveal max-w-[660px]" data-dir="left">
          <span className="rv-eyebrow inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/60 px-3.5 py-[7px] text-[var(--rv-ink)]">
            So funktioniert&apos;s
          </span>
          <h2 className="mt-[22px] text-[clamp(1.9rem,3.6vw,2.7rem)] leading-[1.12] font-bold tracking-[-0.025em] text-[var(--rv-ink)]">
            Von der Anzeige zum
            <br />
            vereinbarten Gespräch.
          </h2>
          <p className="mt-[18px] max-w-[560px] text-[clamp(1rem,1.25vw,1.12rem)] leading-[1.65] text-[rgba(12,26,22,.78)]">
            Vier Schritte vom Inserat bis zum Kalendereintrag, eingerichtet in wenigen
            Minuten. Es braucht dafür weder ein Einführungsprojekt noch deine IT.
          </p>
        </div>

        <div className="mt-11 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <div key={step.title} className={`reveal relative pt-[18px] ${i > 0 ? (i < 4 ? `s${i + 1}` : "") : ""} ${i < STEPS.length - 1 ? "rv-step-connector" : ""}`}>
              <div className="mb-4 flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[var(--rv-ink)] text-[.9rem] font-bold text-white">
                {i + 1}
              </div>
              <h3 className="mb-2 text-[1.12rem] font-bold text-[var(--rv-ink)]">{step.title}</h3>
              <p className="text-[.93rem] text-[rgba(12,26,22,.76)]">{step.text}</p>
            </div>
          ))}
        </div>

        <div className="reveal s5 mt-12 text-center">
          <RvButton variant="light" size="lg" asChild>
            <Link href="/auth/register">Erste Stelle kostenlos testen</Link>
          </RvButton>
          <p className="mt-3.5 text-[.84rem] text-[rgba(12,26,22,.65)]">
            {`${PLANS.free.matches} Bewertungen gratis \u00b7 keine Kreditkarte`}
          </p>
        </div>
      </div>
    </section>
  )
}
