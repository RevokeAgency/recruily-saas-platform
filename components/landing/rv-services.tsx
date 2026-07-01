"use client"

import { useEffect, useRef, useState } from "react"
import { Clock3, ShieldCheck } from "lucide-react"

import { useReveal } from "@/lib/hooks/useReveal"
import { useCountUp } from "@/lib/hooks/useCountUp"
import { RvCard } from "./rv-card"

const LAYERS = [
  { label: "Hard Skills", value: 92 },
  { label: "Berufserfahrung", value: 78 },
  { label: "Soft Skills", value: 85 },
  { label: "Motivation & Kultur-Fit", value: 71 },
]

const SIDE_CARDS = [
  {
    icon: Clock3,
    num: "3 min",
    title: "Vom Job zum Apply-Link",
    text: "URL einfügen, KI befüllt das Formular automatisch. Stelle aktivieren und Apply-Link sofort teilen.",
  },
  {
    icon: ShieldCheck,
    num: "100%",
    title: "DSGVO-konform, immer",
    text: "Alle Daten bleiben auf EU-Servern in Frankfurt. Kein Training auf Bewerberdaten. AI Act konform.",
  },
]

export function RvServices() {
  const ref = useReveal()
  const scoreBoxRef = useRef<HTMLDivElement>(null)
  const [scoreInView, setScoreInView] = useState(false)
  const score = useCountUp(87, scoreInView, 1400)

  useEffect(() => {
    const el = scoreBoxRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setScoreInView(true)),
      { threshold: 0.5 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section id="services" ref={ref} className="relative overflow-hidden bg-[var(--rv-mist)] py-[clamp(72px,9vw,130px)]">
      <div className="rv-patternbg" data-pattern="rings" />
      <div className="relative z-[1] mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="reveal mb-14 max-w-[660px]" data-dir="left">
          <span className="rv-eyebrow inline-flex items-center gap-2 rounded-full border border-[rgba(12,26,22,.10)] bg-white px-3.5 py-[7px] text-[var(--rv-ink-soft)] shadow-[var(--rv-shadow-sm)] before:h-[7px] before:w-[7px] before:rounded-full before:bg-[image:var(--rv-gradient)]">
            Wie wir dir helfen
          </span>
          <h2 className="mt-[22px] text-[clamp(1.9rem,3.6vw,2.7rem)] leading-[1.12] font-bold tracking-[-0.025em] text-[var(--rv-ink)]">
            Kein Keyword-Matching.
            <br />
            <span className="rv-gradient-text">Echter KI-Recruiter.</span>
          </h2>
          <p className="mt-[18px] text-[clamp(1rem,1.25vw,1.12rem)] leading-[1.65] text-[var(--rv-muted)]">
            Revetly analysiert CV und Anschreiben gemeinsam – und erklärt jede Entscheidung mit konkreten Belegen.
          </p>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="reveal grid overflow-hidden rounded-[var(--rv-radius-lg)] border border-[rgba(12,26,22,.10)] bg-white shadow-[var(--rv-shadow)] md:grid-cols-2" data-dir="left">
            <div className="flex flex-col gap-[22px] border-b border-[rgba(12,26,22,.10)] bg-[var(--rv-mist-2)] p-[26px] md:border-r md:border-b-0">
              <div ref={scoreBoxRef}>
                <div className="flex items-baseline gap-1.5">
                  <div className="text-[3.6rem] leading-none font-extrabold tracking-[-0.06em] text-[var(--rv-ink)]">{score}</div>
                  <div className="text-[1.1rem] font-semibold text-[var(--rv-muted)]">/100</div>
                </div>
                <div className="mt-0.5 text-[.74rem] font-semibold tracking-[.06em] text-[var(--rv-muted)] uppercase">Match Score</div>
              </div>
              <div className="flex flex-col gap-3">
                {LAYERS.map((layer) => (
                  <div key={layer.label}>
                    <div className="mb-[5px] flex items-center justify-between">
                      <span className="text-[.73rem] font-semibold text-[var(--rv-ink-soft)]">{layer.label}</span>
                      <b className="text-[.73rem] font-bold text-[var(--rv-green-deep)]">{layer.value}</b>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-[rgba(12,26,22,.10)]">
                      <div
                        className="reveal rv-sb-bar h-full rounded-full bg-[image:var(--rv-gradient)]"
                        style={{ "--w": `${layer.value}%` } as React.CSSProperties}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2.5 rounded-xl border border-[rgba(12,26,22,.10)] bg-white p-[11px_13px]">
                <div className="h-[34px] w-[34px] flex-none rounded-full" style={{ backgroundImage: "var(--rv-gradient)" }} />
                <div>
                  <b className="block text-[.82rem] font-bold text-[var(--rv-ink)]">Lena Maier</b>
                  <span className="text-[.7rem] text-[var(--rv-muted)]">Frontend Dev · Wien</span>
                </div>
                <div className="ml-auto flex-none rounded-full bg-[image:var(--rv-gradient)] px-[9px] py-1 text-[.69rem] font-bold whitespace-nowrap text-[var(--rv-ink)]">
                  Top-Match
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-center gap-4 p-[26px]">
              <div className="w-fit rounded-full bg-[rgba(22,199,124,.12)] px-3 py-[5px] text-[.71rem] font-bold tracking-[.08em] text-[var(--rv-green-deep)] uppercase">
                6 Analyse-Ebenen
              </div>
              <h3 className="text-[clamp(1.05rem,1.5vw,1.28rem)] leading-[1.35] font-bold tracking-[-0.025em] text-[var(--rv-ink)]">
                Mehr als Schlagwort-Suche
              </h3>
              <p className="text-[.9rem] leading-[1.64] text-[var(--rv-muted)]">
                Revetly bewertet Hard Skills, Soft Skills, Kultur-Fit und Motivation – direkt aus CV und Anschreiben.
                Jeder Score ist erklärbar, jede Entscheidung nachvollziehbar.
              </p>
              <ul className="flex flex-col gap-2">
                {["Erklärbarer Score mit Stärken und Risiken", "K.O.-Kriterien konfigurierbar pro Stelle", "Anschreiben als Qualitätssignal genutzt"].map(
                  (item) => (
                    <li key={item} className="flex items-center gap-2.5 text-[.85rem] text-[var(--rv-ink-soft)]">
                      <span className="h-1.5 w-1.5 flex-none rounded-full bg-[image:var(--rv-gradient)]" />
                      {item}
                    </li>
                  ),
                )}
              </ul>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            {SIDE_CARDS.map((card, i) => (
              <RvCard key={card.title} tilt spotlight className={`reveal flex-1 p-[26px_24px] ${i > 0 ? `s${i + 1}` : "s1"}`} data-dir="right">
                <div className="mb-[14px] flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--rv-ink)] text-white">
                  <card.icon className="h-[19px] w-[19px]" strokeWidth={2.2} />
                </div>
                <div className="mb-2 text-[2.6rem] leading-none font-extrabold tracking-[-0.04em] text-[var(--rv-ink)]">{card.num}</div>
                <h3 className="mb-2.5 text-[1.04rem] font-bold tracking-[-0.015em] text-[var(--rv-ink)]">{card.title}</h3>
                <p className="text-[.87rem] leading-[1.58] text-[var(--rv-muted)]">{card.text}</p>
              </RvCard>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
