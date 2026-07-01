"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Star } from "lucide-react"

import { useReveal } from "@/lib/hooks/useReveal"

const TESTIMONIALS = [
  {
    quote: "Revetly hat unsere Time-to-Hire halbiert. In drei Wochen hatten wir mehr qualifizierte Kandidaten als in den sechs Monaten davor.",
    name: "Sarah M.",
    role: "Talent Acquisition Lead · TechStaff GmbH",
    avatar: "S",
    gradient: "linear-gradient(135deg,#22C1EE,#16C77C)",
  },
  {
    quote: "Der Matching Score ist ein Game-Changer. Kein manuelles Screening mehr – wir interviewen nur noch die wirklich passenden Kandidaten.",
    name: "Thomas K.",
    role: "Geschäftsführer · Personalleasing GmbH",
    avatar: "T",
    gradient: "linear-gradient(135deg,#6366F1,#8B5CF6)",
  },
  {
    quote: "Endlich ein Tool, das DSGVO ernst nimmt und trotzdem schnell ist. Setup in 10 Minuten, erste Matches in unter einer Stunde.",
    name: "Julia R.",
    role: "HR Managerin · Münchner Scale-Up",
    avatar: "J",
    gradient: "linear-gradient(135deg,#EC4899,#F43F5E)",
  },
  {
    quote: "Wir besetzen Stellen jetzt in Tagen statt Wochen. Das Anschreiben-Feature ist Gold wert – man sieht sofort, wer wirklich motiviert ist.",
    name: "Markus B.",
    role: "CEO · TechStaff AG Zürich",
    avatar: "M",
    gradient: "linear-gradient(135deg,#F59E0B,#EF4444)",
  },
  {
    quote: "Die Anschreiben-Analyse findet Talente, die wir übersehen hätten. Unser Team spart 6 Stunden pro Stelle – Zeit für die wirklich wichtigen Gespräche.",
    name: "Nina H.",
    role: "Recruiterin · Vienna HR Consulting",
    avatar: "N",
    gradient: "linear-gradient(135deg,#10B981,#059669)",
  },
  {
    quote: "Endlich Transparenz im Matching – mein Team liebt es. Wir sehen genau, warum ein Kandidat empfohlen wird. Das gibt uns Sicherheit bei jeder Entscheidung.",
    name: "David L.",
    role: "Head of People · Berlin Scale-Up",
    avatar: "D",
    gradient: "linear-gradient(135deg,#3B82F6,#1D4ED8)",
  },
]

const LOGOS = ["TechStaff GmbH", "Personalleasing GmbH", "Vienna HR Consulting", "Nordtalent AG", "RecrutePLUS"]

const TC_DUR = 5500

function stateAt(offset: number, total: number) {
  const o = ((offset % total) + total) % total
  if (o === 0) return "active"
  if (o === 1) return "behind1"
  if (o === 2) return "behind2"
  return "hidden"
}

export function RvTestimonials() {
  const ref = useReveal()
  const [cur, setCur] = useState(0)
  const [exiting, setExiting] = useState<number | null>(null)
  const [barKey, setBarKey] = useState(0)
  const busyRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const touchX = useRef(0)
  const total = TESTIMONIALS.length

  const goTo = useCallback(
    (next: number) => {
      const n = ((next % total) + total) % total
      if (busyRef.current || n === cur) return
      busyRef.current = true
      setExiting(cur)
      setCur(n)
      setBarKey((k) => k + 1)
      window.setTimeout(() => {
        setExiting(null)
        busyRef.current = false
      }, 450)
    },
    [cur, total],
  )

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    timerRef.current = setInterval(() => goTo(cur + 1), TC_DUR)
  }, [cur, goTo])

  useEffect(() => {
    startTimer()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur])

  return (
    <section id="testimonials" ref={ref} className="relative overflow-hidden bg-[var(--rv-mist)] py-[clamp(72px,9vw,130px)]">
      <div className="rv-patternbg" data-pattern="diagonal" />
      <div className="relative z-[1] mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="reveal mx-auto max-w-[660px] text-center" data-dir="scale">
          <span className="rv-eyebrow inline-flex items-center gap-2 rounded-full border border-[rgba(12,26,22,.10)] bg-[var(--rv-mist)] px-3.5 py-[7px] text-[var(--rv-ink-soft)] before:h-[7px] before:w-[7px] before:rounded-full before:bg-[image:var(--rv-gradient)]">
            Kundenstimmen
          </span>
          <h2 className="mt-[22px] text-[clamp(1.9rem,3.6vw,2.7rem)] leading-[1.12] font-bold tracking-[-0.025em] text-[var(--rv-ink)]">
            Du bist in guter Gesellschaft.
          </h2>
          <p className="mx-auto mt-[18px] max-w-[520px] text-[clamp(1rem,1.25vw,1.12rem)] leading-[1.65] text-[var(--rv-muted)]">
            HR-Teams im DACH-Raum vertrauen auf Revetly.
          </p>
        </div>

        <div
          className="reveal relative mx-auto mt-[52px] max-w-[680px]"
          onMouseEnter={() => timerRef.current && clearInterval(timerRef.current)}
          onMouseLeave={startTimer}
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            const dx = touchX.current - e.changedTouches[0].clientX
            if (Math.abs(dx) > 44) goTo(dx > 0 ? cur + 1 : cur - 1)
          }}
        >
          <div className="relative min-h-[280px] pb-9">
            {TESTIMONIALS.map((t, i) => {
              const offset = i === exiting ? null : ((i - cur) % total + total) % total
              const state = i === exiting ? "exit" : stateAt(offset ?? 0, total)
              return (
                <div
                  key={t.name}
                  className="rv-tc-card overflow-hidden rounded-[28px] bg-white p-[38px_44px_34px] shadow-[0_28px_70px_-36px_rgba(12,26,22,.22),0_0_0_1px_rgba(12,26,22,.10)]"
                  data-state={state}
                >
                  <div className={`rv-tc-bar ${state === "active" ? "run" : ""}`} style={{ "--tc-dur": `${TC_DUR}ms` } as React.CSSProperties} key={state === "active" ? barKey : undefined} />
                  <span className="pointer-events-none absolute top-3 right-[26px] font-serif text-[6rem] leading-none text-[rgba(22,199,124,.12)] italic select-none">
                    &ldquo;
                  </span>
                  <div className="mb-[18px] flex gap-1 text-[var(--rv-green)]">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star key={s} className="h-[17px] w-[17px] drop-shadow-[0_2px_5px_rgba(22,199,124,.4)]" fill="currentColor" />
                    ))}
                  </div>
                  <p className="mb-7 text-[clamp(1.05rem,1.5vw,1.24rem)] leading-[1.58] font-semibold tracking-[-0.02em] text-[var(--rv-ink)]">
                    {t.quote}
                  </p>
                  <div className="flex items-center gap-3.5">
                    <div
                      className="flex h-[50px] w-[50px] flex-none items-center justify-center rounded-full border-[3px] border-white text-[1.3rem] font-bold text-white/95 shadow-[0_6px_18px_-8px_rgba(12,26,22,.38),0_0_0_2px_rgba(22,199,124,.12)]"
                      style={{ backgroundImage: t.gradient }}
                    >
                      {t.avatar}
                    </div>
                    <div>
                      <b className="block text-[.95rem] font-bold text-[var(--rv-ink)]">{t.name}</b>
                      <span className="text-[.8rem] text-[var(--rv-muted)]">{t.role}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-[18px] flex items-center justify-center gap-[18px]">
            <button
              className="flex h-[46px] w-[46px] items-center justify-center rounded-full border-[1.5px] border-[rgba(12,26,22,.16)] bg-white text-[var(--rv-ink)] shadow-[var(--rv-shadow-sm)] transition-colors hover:bg-[image:var(--rv-gradient)] hover:border-transparent"
              onClick={() => {
                goTo(cur - 1)
                startTimer()
              }}
              aria-label="Vorherige"
            >
              <ChevronLeft className="h-[17px] w-[17px]" strokeWidth={2.4} />
            </button>
            <div className="flex items-center gap-1.5">
              {TESTIMONIALS.map((t, i) => (
                <button
                  key={t.name}
                  className={`rv-tc-dot ${i === cur ? "active" : ""}`}
                  onClick={() => {
                    goTo(i)
                    startTimer()
                  }}
                  aria-label={`${i + 1}`}
                />
              ))}
            </div>
            <button
              className="flex h-[46px] w-[46px] items-center justify-center rounded-full border-[1.5px] border-[rgba(12,26,22,.16)] bg-white text-[var(--rv-ink)] shadow-[var(--rv-shadow-sm)] transition-colors hover:bg-[image:var(--rv-gradient)] hover:border-transparent"
              onClick={() => {
                goTo(cur + 1)
                startTimer()
              }}
              aria-label="Nächste"
            >
              <ChevronRight className="h-[17px] w-[17px]" strokeWidth={2.4} />
            </button>
          </div>
        </div>

        <div className="reveal mt-[52px] flex flex-wrap items-center justify-center gap-x-[30px] gap-y-3 border-t border-[rgba(12,26,22,.10)] pt-[34px]">
          {LOGOS.map((logo) => (
            <span key={logo} className="text-[.96rem] font-extrabold tracking-[-0.02em] whitespace-nowrap text-[var(--rv-ink)] opacity-[.28] transition-opacity hover:opacity-60">
              {logo}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
