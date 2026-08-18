"use client"

import { useId, useState } from "react"

import { useReveal } from "@/lib/hooks/useReveal"

const FAQS = [
  {
    q: "Was ist ein Match?",
    a: "Ein Match ist die Bewertung genau einer Bewerbung gegen genau eine Stelle. Zwanzig Bewerbungen auf einen Job sind zwanzig Matches. Im kostenlosen Plan sind zehn enthalten, danach wechselst du auf einen bezahlten Plan.",
  },
  {
    q: "Wie kommt die Match Analyse zustande?",
    a: "Zuerst entsteht aus dem vollständigen Lebenslauf ein Kurzdossier. Dann prüft Revetly deterministisch, welche geforderten Fähigkeiten wirklich gedeckt sind. Erst danach bewertet ein Modell die neun Ebenen, muss vor jeder Zahl begründen und Belege nennen. Zum Schluss kontrolliert ein zweites Modell jede Kategorie gegen und korrigiert, wo nötig. Du siehst am Ende beide Urteile.",
  },
  {
    q: "Kann ich mehrere Stellen parallel betreiben?",
    a: "Ja. Die Zahl der Stellen ist nicht begrenzt, dein Kontingent gilt stellenübergreifend. Neue Stellen gleicht Revetly automatisch gegen deinen bestehenden Kandidatenpool ab.",
  },
  {
    q: "Was passiert, wenn mein Kontingent aufgebraucht ist?",
    a: "Du wirst rechtzeitig benachrichtigt. Weitere Bewerbungen kommen weiterhin an und warten auf die Bewertung, sobald du aufstockst. Bereits bewertete Kandidaten und alle Daten bleiben unverändert.",
  },
  {
    q: "Wo werden die Bewerberdaten verarbeitet?",
    a: "Datenbank und Dateien liegen in Frankfurt, die KI-Auswertung läuft bei Mistral AI in Frankreich, der Mailversand über Lettermint in Europa. Auf Bewerberdaten wird nicht trainiert. Nach 180 Tagen löscht Revetly automatisch, und Bewerber können ihre Löschung selbst anstoßen.",
  },
  {
    q: "Wie viel Einrichtung braucht das?",
    a: "Wenig. Du fügst den Link deiner Stellenanzeige ein, Revetly liest sie aus. Danach kannst du Bewerbungen hochladen oder den Apply-Link teilen. Wer Termine automatisch buchen lassen will, verbindet einmalig seinen Google- oder Microsoft-Kalender.",
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
