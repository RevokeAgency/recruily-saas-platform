import Link from "next/link"

import { useReveal } from "@/lib/hooks/useReveal"
import { RvButton } from "./rv-button"

const STEPS = [
  {
    title: "Job anlegen",
    text: "URL einfügen – Revetly liest die Stellenanzeige und befüllt alle Felder automatisch. In unter 3 Minuten online.",
  },
  {
    title: "CVs hochladen",
    text: "PDF oder DOCX hochladen. Die KI parst CV und Anschreiben und bewertet auf 6 Ebenen – ohne manuelle Eingabe.",
  },
  {
    title: "Shortlist sehen",
    text: "Kandidaten nach Score sortiert, mit Stärken, Risiken und K.O.-Kriterien. Du weißt sofort, wen du anrufen sollst.",
  },
  {
    title: "Einladen oder absagen",
    text: "Mit einem Klick geht eine personalisierte Einladung oder Absage raus – automatisch, professionell, DSGVO-konform.",
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
            Von der Stelle zur
            <br />
            Shortlist – in Minuten.
          </h2>
          <p className="mt-[18px] max-w-[560px] text-[clamp(1rem,1.25vw,1.12rem)] leading-[1.65] text-[rgba(12,26,22,.78)]">
            Vier Schritte, die dein Recruiting komplett verändern. Kein Setup, keine Schulung.
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
            <Link href="/auth/register">Jetzt kostenlos ausprobieren</Link>
          </RvButton>
          <p className="mt-3.5 text-[.84rem] text-[rgba(12,26,22,.65)]">
            10 Matches gratis &middot; kein Account &middot; keine Kreditkarte
          </p>
        </div>
      </div>
    </section>
  )
}
