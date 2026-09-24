import Link from "next/link"

import { useReveal } from "@/lib/hooks/useReveal"
import { RvButton } from "./rv-button"
import { PLANS } from "@/lib/plans"

// Fünf Schritte, von der Anzeige bis zur Übergabe an das HR-System. Der letzte
// Schritt ist bewusst die Entscheidung durch den Menschen: Revetly sortiert
// und organisiert, eingestellt wird, wen du auswählst.
const STEPS = [
  {
    title: "Stelle anlegen",
    text: "Du fügst den Link deiner Stellenanzeige ein, Revetly liest Aufgaben und Anforderungen heraus. Was zwingend nötig ist, etwa eine Berufszulassung, legst du als K.O.-Kriterium fest.",
  },
  {
    title: "Bewerbungen sammeln",
    text: "Über deine eigene Bewerbungsseite, per E-Mail an die Stellenadresse oder per Upload, auch als gescanntes PDF.",
  },
  {
    title: "Shortlist lesen",
    text: "Statt eines Stapels bekommst du eine Rangfolge, und zu jedem Kandidaten siehst du, warum er dort steht.",
  },
  {
    title: "Gespräche führen",
    text: "Wer weiterkommt, bucht selbst einen Termin in deinem Kalender. Für das Gespräch bekommst du einen Leitfaden, der an den offenen Punkten des Lebenslaufs ansetzt.",
  },
  {
    title: "Entscheiden",
    text: "Du triffst die Wahl, Revetly schließt die Stelle ab und verschickt die Absagen. Die eingestellte Person überträgst du in dein HR-System.",
  },
]

export function RvHowItWorks() {
  const ref = useReveal()

  return (
    <section id="ablauf" ref={ref} className="relative overflow-hidden bg-[image:var(--rv-gradient)] py-[clamp(72px,9vw,130px)]">
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
          <h2 className="mt-[22px] text-[clamp(1.9rem,3.6vw,2.7rem)] leading-[1.12] font-bold tracking-[-0.025em] text-balance text-[var(--rv-ink)]">
            Von der Stellenanzeige bis zur Zusage in einem System.
          </h2>
          <p className="mt-[18px] max-w-[560px] text-[clamp(1rem,1.25vw,1.12rem)] leading-[1.65] text-[rgba(12,26,22,.78)]">
            Fünf Schritte, eingerichtet ohne IT und ohne Einführungsprojekt.
          </p>
        </div>

        {/* Mobil einspaltig, ab sm zwei, ab lg alle fünf in einer Reihe. Die
            Verbindungslinie zwischen den Nummern gibt es nur in der Reihe. */}
        <ol className="mt-11 grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className={`reveal relative pt-[18px] ${i > 0 ? `s${Math.min(i + 1, 5)}` : ""} ${i < STEPS.length - 1 ? "rv-step-connector" : ""}`}
            >
              <div className="mb-4 flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[var(--rv-ink)] text-[.9rem] font-bold text-white">
                {i + 1}
              </div>
              <h3 className="mb-2 text-[1.08rem] font-bold text-[var(--rv-ink)]">{step.title}</h3>
              <p className="text-[.9rem] leading-[1.6] text-[rgba(12,26,22,.76)]">{step.text}</p>
            </li>
          ))}
        </ol>

        <div className="reveal s5 mt-12 text-center">
          <RvButton variant="light" size="lg" asChild>
            <Link href="/auth/register">Erste Stelle kostenlos testen</Link>
          </RvButton>
          <p className="mt-3.5 text-[.84rem] text-[rgba(12,26,22,.65)]">
            {`${PLANS.free.matches} Matches gratis · keine Kreditkarte`}
          </p>
        </div>
      </div>
    </section>
  )
}
