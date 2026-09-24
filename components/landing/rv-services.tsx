"use client"

import { useEffect, useRef, useState } from "react"
import { Layers, Lock, ScanSearch } from "lucide-react"

import { useReveal } from "@/lib/hooks/useReveal"
import { useCountUp } from "@/lib/hooks/useCountUp"

const LAYERS = [
  { label: "Hard Skills", value: 92 },
  { label: "Berufserfahrung", value: 78 },
  { label: "Soft Skills", value: 85 },
  { label: "Motivation & Kultur-Fit", value: 71 },
]

const POINTS = [
  {
    icon: Layers,
    title: "Neun Ebenen statt Schlagwortsuche.",
    text: "Hard Skills, Berufserfahrung, Ausbildung, Soft Skills, Sprachen, Standort, Branche, Gehaltsvorstellung und Kultur-Fit, jede einzeln begründet.",
  },
  {
    icon: ScanSearch,
    title: "Zweite Prüfinstanz.",
    text: "Ein unabhängiges zweites Modell prüft jede Ebene nach und korrigiert Ausreißer. Beide Urteile bleiben sichtbar.",
  },
  {
    icon: Lock,
    title: "Qualifikationssperre.",
    text: "Fehlt eine geforderte Zulassung, etwa ein Pflegediplom oder eine Nostrifikation, bleibt der Score gedeckelt. Gute Sprachkenntnisse rechnen sie nicht weg.",
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
    <section id="match-analyse" ref={ref} className="relative overflow-hidden bg-[var(--rv-mist)] py-[clamp(72px,9vw,130px)]">
      <div className="rv-patternbg" data-pattern="rings" />
      <div className="relative z-[1] mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="reveal mb-14 max-w-[660px]" data-dir="left">
          <span className="rv-eyebrow inline-flex items-center gap-2 rounded-full border border-[rgba(12,26,22,.10)] bg-white px-3.5 py-[7px] text-[var(--rv-ink-soft)] shadow-[var(--rv-shadow-sm)] before:h-[7px] before:w-[7px] before:rounded-full before:bg-[image:var(--rv-gradient)]">
            Revetly Match Analyse
          </span>
          <h2 className="mt-[22px] text-[clamp(1.9rem,3.6vw,2.7rem)] leading-[1.12] font-bold tracking-[-0.025em] text-[var(--rv-ink)]">
            Lies die Shortlist,
            <br />
            <span className="rv-gradient-text">nicht den Stapel.</span>
          </h2>
          <p className="mt-[18px] text-[clamp(1rem,1.25vw,1.12rem)] leading-[1.65] text-[var(--rv-muted)]">
            Revetly liest Lebenslauf und Anschreiben zusammen, prüft neun Ebenen einzeln und
            legt zu jeder Zahl die Stelle aus den Unterlagen daneben. Du siehst nicht nur, wer
            vorne liegt, sondern warum.
          </p>
        </div>

        <div className="reveal grid overflow-hidden rounded-[var(--rv-radius-lg)] border border-[rgba(12,26,22,.10)] bg-white shadow-[var(--rv-shadow)] md:grid-cols-2" data-dir="left">
          <div className="flex flex-col gap-[22px] border-b border-[rgba(12,26,22,.10)] bg-[var(--rv-mist-2)] p-[26px] md:border-r md:border-b-0">
            <div className="flex items-start justify-between gap-4">
              <div ref={scoreBoxRef}>
                <div className="flex items-baseline gap-1.5">
                  <div className="text-[3.6rem] leading-none font-extrabold tracking-[-0.06em] text-[var(--rv-ink)]">{score}</div>
                  <div className="text-[1.1rem] font-semibold text-[var(--rv-muted)]">/100</div>
                </div>
                <div className="mt-0.5 text-[.74rem] font-semibold tracking-[.06em] text-[var(--rv-muted)] uppercase">Match Score</div>
              </div>
              {/* Kennzeichnet die Karte als Anschauungsbeispiel. Name, Foto und
                  Werte sind keine echten Bewerberdaten. */}
              <span className="rounded-full border border-[rgba(12,26,22,.12)] bg-white px-2.5 py-1 text-[.64rem] font-bold tracking-[.08em] text-[var(--rv-muted)] uppercase">
                Beispiel
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {LAYERS.map((layer) => (
                <div key={layer.label}>
                  <div className="mb-[5px] flex items-center justify-between">
                    <span className="text-[.73rem] font-semibold text-[var(--rv-ink-soft)]">{layer.label}</span>
                    <b className="text-[.73rem] font-bold text-[var(--rv-green-deep)]">{layer.value}</b>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-[rgba(12,26,22,.10)]">
                    {/* Kein `reveal` auf dem Balken selbst: die Breite steuert der
                        Vorfahre per `.reveal.in .rv-sb-bar`. Traegt der Balken die
                        Klasse zusaetzlich, setzt ihn `.reveal` auf opacity 0, und
                        er kommt da nie wieder raus, weil er mit Breite 0 keine
                        Flaeche hat, die der IntersectionObserver sehen koennte. */}
                    <div
                      className="rv-sb-bar h-full rounded-full bg-[image:var(--rv-gradient)]"
                      style={{ "--w": `${layer.value}%` } as React.CSSProperties}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-[rgba(12,26,22,.10)] bg-white p-[11px_13px]">
              {/* Verlauf bleibt als Untergrund: Laedt das Foto nicht, steht dort
                  weiter der Markenkreis statt eines kaputten Bildsymbols.
                  alt ist leer, weil der Name direkt daneben steht. */}
              <div
                className="h-[34px] w-[34px] flex-none overflow-hidden rounded-full"
                style={{ backgroundImage: "var(--rv-gradient)" }}
              >
                <img
                  src="https://wciddwedyrgwjsppzlfr.supabase.co/storage/v1/object/public/candidate-photos/Bild1.png"
                  alt=""
                  width={34}
                  height={34}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <b className="block text-[.82rem] font-bold text-[var(--rv-ink)]">Lena Maier</b>
                <span className="text-[.7rem] text-[var(--rv-muted)]">Frontend Dev · Wien</span>
              </div>
              <div className="ml-auto flex-none rounded-full bg-[image:var(--rv-gradient)] px-[9px] py-1 text-[.69rem] font-bold whitespace-nowrap text-[var(--rv-ink)]">
                Top-Match
              </div>
            </div>
          </div>
          <ul className="flex flex-col justify-center gap-7 p-[26px] lg:p-[38px]">
            {POINTS.map((point) => (
              <li key={point.title} className="flex gap-4">
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-[var(--rv-ink)] text-white">
                  <point.icon className="h-[19px] w-[19px]" strokeWidth={2.1} />
                </div>
                <div>
                  <h3 className="text-[1.05rem] leading-[1.35] font-bold tracking-[-0.02em] text-[var(--rv-ink)]">{point.title}</h3>
                  <p className="mt-1.5 text-[.9rem] leading-[1.62] text-[var(--rv-muted)]">{point.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
