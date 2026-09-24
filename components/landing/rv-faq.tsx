"use client"

import { useId, useState } from "react"

import { useReveal } from "@/lib/hooks/useReveal"
import { PLANS } from "@/lib/plans"

// Die Zahlen kommen aus lib/plans.ts. "Wie viele Stellen" nannte früher
// "nicht begrenzt", obwohl die Pläne Stellen sehr wohl begrenzen.
const FAQS = [
  {
    q: "Was zählt als Match?",
    a: `Ein Match ist die Analyse genau einer Bewerbung für genau eine Stelle. Zwanzig Bewerbungen auf eine Stelle ergeben zwanzig Matches. Zum Testen bekommst du eine Probestelle mit ${PLANS.free.matches} Matches, danach wechselst du auf einen bezahlten Plan.`,
  },
  {
    q: "Ersetzt Revetly mein HR-System?",
    a: "Nein. Revetly deckt die Auswahl ab, von der Stellenanzeige bis zur Zusage. Danach überträgst du die eingestellte Person in dein HR-System.",
  },
  {
    q: "Wer trifft die Entscheidung?",
    a: "Immer du. Revetly sortiert, begründet und organisiert, eingestellt wird nur, wen du auswählst.",
  },
  {
    q: "Wie kommt die Revetly Match Analyse zustande?",
    a: "Aus dem vollständigen Lebenslauf entsteht zuerst ein Kurzdossier, danach prüft Revetly nach festen Regeln, welche geforderten Fähigkeiten wirklich gedeckt sind. Erst dann prüft ein Modell die neun Ebenen und muss vor jeder Zahl Begründung und Beleg liefern. Ein zweites Modell kontrolliert das Ergebnis gegen und korrigiert, wo nötig, und du siehst am Ende beide Urteile.",
  },
  {
    q: "Wie viele Stellen kann ich parallel betreiben?",
    a: "Das hängt vom Plan ab, von einer Probestelle im kostenlosen Plan bis unbegrenzt im Pro-Plan. Dein Match-Kontingent gilt stellenübergreifend.",
  },
  {
    q: "Was passiert, wenn mein Kontingent aufgebraucht ist?",
    a: "Du wirst rechtzeitig benachrichtigt, bevor es so weit ist. Weitere Bewerbungen kommen trotzdem an und warten auf ihren Match, sobald du aufstockst. Bereits gematchte Kandidaten und alle Daten bleiben dabei unverändert erhalten.",
  },
  {
    q: "Wo werden die Bewerberdaten verarbeitet?",
    a: "Ausschließlich in der EU. Das gilt für die Speicherung, die KI-Auswertung und den Mailversand gleichermaßen. Aus deinen Entscheidungen lernt Revetly nur für dein Konto und nur mit deiner ausdrücklichen Zustimmung. Nach 180 Tagen löscht Revetly automatisch, und Bewerber können ihre Löschung jederzeit selbst anstoßen. Welche Auftragsverarbeiter im Einzelnen beteiligt sind, steht in der Datenschutzerklärung.",
  },
  {
    q: "Kann ich monatlich kündigen?",
    a: "Ja, alle bezahlten Pläne sind monatlich kündbar, direkt in deinem Kundenkonto. Die Probestelle ist kostenlos und verlangt keine Kreditkarte.",
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
