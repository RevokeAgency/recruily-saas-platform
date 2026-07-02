"use client"

import { useId, useState } from "react"

import { useReveal } from "@/lib/hooks/useReveal"

const FAQS = [
  {
    q: "Was ist ein Match?",
    a: "Ein Match ist eine Analyse von genau einem CV gegen genau eine Stelle. Du lädst z. B. 20 Bewerbungen für einen Job hoch – das sind 20 Matches. Der Free-Plan enthält 10 Matches, danach wechselst du auf einen bezahlten Plan.",
  },
  {
    q: "Wie funktioniert der Matching Score?",
    a: "Revetly analysiert CV und Anschreiben gemeinsam und bewertet jeden Kandidaten auf 6 Ebenen – von Hard Skills und Berufserfahrung bis Kultur-Fit und Motivation. Jeder Score wird mit konkreten Belegen begründet, damit du die Entscheidung triffst, nicht die Black Box.",
  },
  {
    q: "Kann ich mehrere Stellen gleichzeitig nutzen?",
    a: "Ja. Du kannst beliebig viele Stellen anlegen und parallel befüllen. Dein Kontingent gilt stellenübergreifend – du entscheidest selbst, wie du deine Matches aufteilst.",
  },
  {
    q: "Was passiert, wenn mein Kontingent aufgebraucht ist?",
    a: "Du bekommst rechtzeitig eine Benachrichtigung. Beim Free-Plan wirst du nach 10 Matches zur Stripe-Checkout-Seite weitergeleitet. Bestehende Matches und Daten bleiben erhalten – nichts geht verloren.",
  },
  {
    q: "Sind meine Daten DSGVO-konform gespeichert?",
    a: "Ja. Alle Daten liegen auf EU-Servern in Frankfurt. Die KI trainiert nicht auf deinen Bewerberdaten, und Revetly ist auf den EU AI Act ausgelegt – mit erklärbaren Entscheidungen und Human Oversight.",
  },
  {
    q: "Wie schnell bin ich startklar?",
    a: "In Minuten. Du legst eine Stelle an (URL reinkopieren genügt), lädst Bewerbungen hoch und siehst sofort die Shortlist. Kein Setup, keine Schulung, keine IT-Abteilung nötig.",
  },
  {
    q: "Kann ich monatlich kündigen?",
    a: "Ja, alle Pläne sind monatlich kündbar. Der Free-Plan bleibt dauerhaft kostenlos – ganz ohne Kreditkarte.",
  },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  const id = useId()

  // The `reveal` class lives on this static wrapper — never on the element whose
  // className changes with `open`. Otherwise React would rewrite that element's
  // className on every toggle and wipe the `.in` class the IntersectionObserver
  // added imperatively, making the item collapse back to its hidden state.
  return (
    <div className="reveal">
      <div className={`rv-faq-item overflow-hidden rounded-2xl border border-[rgba(12,26,22,.10)] bg-white ${open ? "open" : ""}`}>
        <button
          className="flex w-full items-center justify-between gap-4 px-[26px] py-[22px] text-left text-[1.02rem] font-bold text-[var(--rv-ink)]"
          aria-controls={id}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {q}
          <span className="rv-faq-pm relative h-6 w-6 flex-none" />
        </button>
        <div className="rv-faq-a" id={id} role="region">
          <div>
            <p className="px-[26px] pb-6 text-[var(--rv-muted)]">{a}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function RvFaq() {
  const ref = useReveal()

  return (
    <section id="faq" ref={ref} className="relative overflow-hidden bg-[var(--rv-mist)] py-[clamp(72px,9vw,130px)]">
      <div className="rv-patternbg" data-pattern="mesh" />
      <div className="relative z-[1] mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="reveal mx-auto max-w-[660px] text-center">
          <span className="rv-eyebrow inline-flex items-center gap-2 rounded-full border border-[rgba(12,26,22,.10)] bg-[var(--rv-mist)] px-3.5 py-[7px] text-[var(--rv-ink-soft)] before:h-[7px] before:w-[7px] before:rounded-full before:bg-[image:var(--rv-gradient)]">
            FAQ
          </span>
          <h2 className="mt-[22px] text-[clamp(1.9rem,3.6vw,2.7rem)] leading-[1.12] font-bold tracking-[-0.025em] text-[var(--rv-ink)]">
            Häufige Fragen.
          </h2>
        </div>
        <div className="mx-auto mt-14 flex max-w-[820px] flex-col gap-3">
          {FAQS.map((faq) => (
            <FaqItem key={faq.q} {...faq} />
          ))}
        </div>
      </div>
    </section>
  )
}
