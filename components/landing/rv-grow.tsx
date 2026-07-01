"use client"

import { useEffect, useRef, useState } from "react"
import { Check } from "lucide-react"

import { useReveal } from "@/lib/hooks/useReveal"
import { useCountUp } from "@/lib/hooks/useCountUp"

const STATS = [
  { target: 70, unit: "%", title: "Weniger Screening-Zeit", text: "Kein manuelles Durchlesen mehr – Revetly priorisiert automatisch nach Score." },
  { target: 3, unit: "×", title: "Mehr qualifizierte Gespräche", text: "Weil der Score auf 6 Ebenen analysiert – nicht nur Schlagwörter abgleicht." },
  { target: 48, unit: "h", title: "Shortlist statt Wochenwarten", text: "Durchschnittliche Zeit bis zur qualifizierten Kandidatenliste – statt Wochen." },
]

const CHIPS = ["DSGVO-konform", "EU AI Act compliant", "Erklärbarer Score", "Human-in-the-loop"]

function Stat({ target, unit, title, text, delay, inView }: { target: number; unit: string; title: string; text: string; delay: string; inView: boolean }) {
  const value = useCountUp(target, inView, 1400)
  return (
    <div className={`reveal rv-spotlight flex flex-col rounded-[var(--rv-radius-lg)] border border-[rgba(12,26,22,.10)] bg-white p-[30px_26px] shadow-[var(--rv-shadow-sm)] transition-transform duration-300 hover:-translate-y-1 ${delay}`} data-dir={delay === "s2" ? "right" : delay === "s1" ? "scale" : "left"}>
      <div className="mb-3.5 flex items-baseline gap-0.5">
        <span className="text-[3.8rem] leading-none font-extrabold tracking-[-0.06em] text-[var(--rv-ink)]">{value}</span>
        <span className="ml-0.5 text-[1.9rem] leading-none font-extrabold tracking-[-0.03em] text-[var(--rv-ink)]">{unit}</span>
      </div>
      <h3 className="mb-2 text-[1.04rem] font-bold tracking-[-0.015em] text-[var(--rv-ink)]">{title}</h3>
      <p className="flex-1 text-[.87rem] leading-[1.58] text-[var(--rv-muted)]">{text}</p>
    </div>
  )
}

export function RvGrow() {
  const ref = useReveal()
  const gridRef = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = gridRef.current
    if (!el) return
    const observer = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && setInView(true)), { threshold: 0.3 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={ref} className="relative overflow-hidden bg-white py-[clamp(72px,9vw,130px)]">
      <div className="rv-patternbg" data-pattern="grid" />
      <div className="relative z-[1] mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="reveal mb-14 max-w-[660px]" data-dir="left">
          <span className="rv-eyebrow inline-flex items-center gap-2 rounded-full border border-[rgba(12,26,22,.10)] bg-white px-3.5 py-[7px] text-[var(--rv-ink-soft)] shadow-[var(--rv-shadow-sm)] before:h-[7px] before:w-[7px] before:rounded-full before:bg-[image:var(--rv-gradient)]">
            Messbare Ergebnisse
          </span>
          <h2 className="mt-[22px] text-[clamp(1.9rem,3.6vw,2.7rem)] leading-[1.12] font-bold tracking-[-0.025em] text-[var(--rv-ink)]">
            Die Zeit, die du sparst,
            <br />
            steckst du ins Interview.
          </h2>
          <p className="mt-[18px] text-[clamp(1rem,1.25vw,1.12rem)] leading-[1.65] text-[var(--rv-muted)]">
            Was HR-Teams im DACH-Raum nach 30 Tagen Revetly berichten:
          </p>
        </div>

        <div ref={gridRef} className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {STATS.map((stat, i) => (
            <Stat key={stat.title} {...stat} delay={i === 0 ? "" : i === 1 ? "s1" : "s2"} inView={inView} />
          ))}

          <div className="reveal s1 grid grid-cols-1 gap-5 rounded-[var(--rv-radius-lg)] bg-[var(--rv-ink)] p-[34px_38px] sm:col-span-2 lg:col-span-3 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-12" data-dir="scale">
            <div className="flex flex-col gap-[18px]">
              <p className="text-[clamp(0.98rem,1.5vw,1.18rem)] leading-[1.68] font-medium tracking-[-0.01em] text-white/88 italic">
                &ldquo;Wir lesen keine Lebensläufe mehr quer. Revetly priorisiert nach Score, begründet jede Bewertung – und unser Team steckt die gewonnene Zeit in echte Gespräche statt in die Vorauswahl.&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full text-[.95rem] font-bold text-[var(--rv-ink)]" style={{ backgroundImage: "var(--rv-gradient)" }}>
                  C
                </div>
                <div>
                  <b className="block text-[.88rem] font-bold text-white">Carolin V.</b>
                  <span className="text-[.74rem] text-white/52">HR-Leitung &middot; Bregenz Industrietechnik</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              {CHIPS.map((chip) => (
                <div key={chip} className="flex items-center gap-2 rounded-full border border-white/11 bg-white/7 px-[15px] py-[9px] text-[.81rem] font-semibold whitespace-nowrap text-white/78">
                  <Check className="h-3 w-3 flex-none text-[var(--rv-green)]" strokeWidth={2.4} />
                  {chip}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
