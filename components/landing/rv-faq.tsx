"use client"

import { useId, useState } from "react"

import { useReveal } from "@/lib/hooks/useReveal"
import { PLANS } from "@/lib/plans"

const FAQS = [
  {
    q: "Was zählt als Match?",
    a: `Ein Match ist die Analyse genau einer Bewerbung für genau eine Stelle. Zwanzig Bewerbungen auf eine Stelle ergeben zwanzig Matches. Im kostenlosen Plan sind ${PLANS.free.matches} pro Monat enthalten, danach wechselst du auf einen bezahlten Plan.`,
  },
  {
    q: "Wie kommt die Revetly Match Analyse zustande?",
    a: "Aus dem vollständigen Lebenslauf entsteht zuerst ein Kurzdossier, danach prüft Revetly nach festen Regeln, welche geforderten Fähigkeiten wirklich gedeckt sind. Erst dann bewertet ein Modell die neun Ebenen und muss vor jeder Zahl Begründung und Beleg liefern. Ein zweites Modell kontrolliert das Ergebnis gegen und korrigiert, wo nötig, und du siehst am Ende beide Urteile.",
  },
  {
    q: "Kann ich mehrere Stellen parallel betreiben?",
    a: "Ja. Die Zahl der Stellen ist nicht begrenzt, dein Kontingent gilt stellenübergreifend. Neue Stellen gleicht Revetly automatisch gegen deinen bestehenden Kandidatenpool ab.",
  },
  {
    q: "Was passiert, wenn mein Kontingent aufgebraucht ist?",
    a: "Du wirst rechtzeitig benachrichtigt, bevor es so weit ist. Weitere Bewerbungen kommen trotzdem an und warten auf ihren Match, sobald du aufstockst. Bereits gematchte Kandidaten und alle Daten bleiben dabei unverändert erhalten.",
  },
  {
    q: "Wo werden die Bewerberdaten verarbeitet?",
    a: "Ausschließlich in der EU. Das gilt für die Speicherung, die KI-Auswertung und den Mailversand gleichermaßen. Auf Bewerberdaten wird nicht trainiert. Nach 180 Tagen löscht Revetly automatisch, und Bewerber können ihre Löschung jederzeit selbst anstoßen. Welche Auftragsverarbeiter im Einzelnen beteiligt sind, steht in der Datenschutzerklärung.",
  },
  {
    q: "Wie viel Einrichtung braucht das?",
    a: "Sehr wenig. Du fügst den Link deiner Stellenanzeige ein, Revetly liest sie aus, und danach kannst du sofort Bewerbungen hochladen oder deinen Apply-Link teilen. Wer Termine automatisch buchen lassen will, verbindet einmalig seinen Google- oder Microsoft-Kalender.",
  },
  {
    q: "Kann ich monatlich kündigen?",
    a: "Ja, alle Pläne sind monatlich kündbar, direkt im Kundenkonto über das Stripe-Portal. Der kostenlose Plan bleibt dauerhaft kostenlos und verlangt keine Kreditkarte.",
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
