"use client"

import { useState } from "react"
import { CalendarCheck, ClipboardList, MailX, MoveHorizontal } from "lucide-react"

import { useReveal } from "@/lib/hooks/useReveal"

// Vorher/Nachher-Vergleich statt einer Aufzaehlung von Schmerzpunkten.
//
// Aufbau: Das Chaos-Panel liegt unten und ist immer vollstaendig da. Das
// Revetly-Panel liegt darueber und wird per clip-path von links aufgedeckt,
// je weiter der Regler nach rechts wandert. Startwert 20, damit zuerst das
// Chaos zu sehen ist und der Griff trotzdem sichtbar zum Ziehen einlaedt.
//
// Bedient wird ueber ein echtes range-Input, das unsichtbar ueber der ganzen
// Flaeche liegt: Damit funktionieren Maus, Touch, Tastatur und Screenreader
// ohne eigene Zeigerlogik. Der sichtbare Griff ist nur Darstellung.

const CHAOS_NOTES = [
  { cls: "left-[4%] top-[11%] w-[26%] -rotate-[7deg]", badge: "Ungelesen" },
  { cls: "left-[34%] top-[5%] w-[23%] rotate-[5deg]", badge: null },
  { cls: "left-[12%] top-[46%] w-[25%] rotate-[3deg]", badge: "Neu" },
  { cls: "left-[45%] top-[33%] w-[24%] -rotate-[4deg]", badge: null },
  { cls: "left-[28%] top-[71%] w-[26%] rotate-[8deg]", badge: null },
  { cls: "left-[68%] top-[58%] w-[23%] -rotate-[9deg]", badge: "Neu" },
  { cls: "left-[62%] top-[14%] w-[22%] rotate-[7deg]", badge: null },
]

const RANKING = [
  { rank: 1, score: 92, top: true },
  { rank: 2, score: 87, top: false },
  { rank: 3, score: 74, top: false },
  { rank: 4, score: 61, top: false },
]

const REVETLY_CHIPS = [
  { icon: ClipboardList, label: "Interview-Leitfaden bereit" },
  { icon: CalendarCheck, label: "Termin gebucht" },
  { icon: MailX, label: "Absage gesendet" },
]

export function RvProblem() {
  const ref = useReveal()
  const [pos, setPos] = useState(20)

  return (
    <section ref={ref} className="relative overflow-clip bg-[var(--rv-mist)] py-[clamp(72px,9vw,130px)]">
      <div className="rv-patternbg" data-pattern="diagonal" />
      <div className="relative z-[1] mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="reveal mx-auto max-w-[660px] text-center" data-dir="scale">
          <span className="rv-eyebrow inline-flex items-center gap-2 rounded-full border border-[rgba(12,26,22,.10)] bg-white px-3.5 py-[7px] text-[var(--rv-ink-soft)] shadow-[var(--rv-shadow-sm)] before:h-[7px] before:w-[7px] before:rounded-full before:bg-[image:var(--rv-gradient)]">
            Vorher und nachher
          </span>
          <h2 className="mt-[22px] text-[clamp(1.9rem,3.6vw,2.7rem)] leading-[1.12] font-bold tracking-[-0.025em] text-balance text-[var(--rv-ink)]">
            Recruiting-Chaos oder <span className="rv-gradient-text">Revetly-Realität.</span>
          </h2>
          <p className="mx-auto mt-[18px] max-w-[540px] text-[clamp(1rem,1.25vw,1.12rem)] leading-[1.65] text-[var(--rv-muted)]">
            Dieselbe Stelle, dieselben Bewerbungen, zwei sehr verschiedene Nachmittage.
            Zieh den Regler nach rechts.
          </p>
        </div>

        <div className="reveal mt-[clamp(36px,4.5vw,56px)]">
          <div className="relative h-[clamp(340px,44vw,520px)] w-full overflow-hidden rounded-[var(--rv-radius-lg)] border border-[rgba(12,26,22,.12)] shadow-[var(--rv-shadow)] select-none">

            {/* Chaos: liegt unten und bleibt immer vollstaendig vorhanden */}
            <div className="absolute inset-0 bg-[#E7E4DF]">
              {CHAOS_NOTES.map((n) => (
                <div
                  key={n.cls}
                  className={`absolute rounded-[6px] border border-[rgba(12,26,22,.10)] bg-white p-[10px_11px] shadow-[0_10px_22px_-14px_rgba(12,26,22,.55)] ${n.cls}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 flex-none rounded-full bg-[#EF4444]" />
                    <span className="h-[5px] flex-1 rounded-full bg-[rgba(12,26,22,.22)]" />
                  </div>
                  <div className="mt-2 flex flex-col gap-[5px]">
                    <span className="block h-[4px] w-full rounded-full bg-[rgba(12,26,22,.10)]" />
                    <span className="block h-[4px] w-[82%] rounded-full bg-[rgba(12,26,22,.10)]" />
                    <span className="block h-[4px] w-[64%] rounded-full bg-[rgba(12,26,22,.10)]" />
                  </div>
                  {n.badge && (
                    <span className="mt-2 inline-block rounded-full bg-[rgba(239,68,68,.12)] px-2 py-[2px] text-[.6rem] font-bold tracking-[.04em] text-[#B91C1C] uppercase">
                      {n.badge}
                    </span>
                  )}
                </div>
              ))}

              {/* Titel rechts: bleibt beim Ziehen am laengsten sichtbar */}
              <span className="absolute top-[5%] right-[4%] rounded-full border border-[rgba(12,26,22,.12)] bg-white/90 px-3.5 py-[7px] text-[.78rem] font-bold text-[var(--rv-ink)] backdrop-blur-sm">
                Recruiting-Chaos
              </span>
              <span className="absolute right-[4%] bottom-[6%] max-w-[46%] text-right text-[.8rem] leading-[1.5] font-semibold text-[rgba(12,26,22,.55)]">
                Wer war noch mal gut? Absage vergessen, Termin kostet fünf Mails.
              </span>
            </div>

            {/* Revetly: liegt darueber und wird von links aufgedeckt */}
            <div
              className="absolute inset-0 bg-[linear-gradient(160deg,#FFFFFF_0%,#EAF6F1_100%)]"
              style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
            >
              <span className="absolute top-[5%] left-[4%] rounded-full bg-[image:var(--rv-gradient)] px-3.5 py-[7px] text-[.78rem] font-bold whitespace-nowrap text-[var(--rv-ink)]">
                Die Revetly-Realität
              </span>

              <div className="absolute inset-x-[4%] top-[19%] rounded-2xl border border-[rgba(12,26,22,.10)] bg-white p-[14px] shadow-[var(--rv-shadow-sm)]">
                <div className="mb-2.5 flex items-baseline justify-between px-2.5">
                  <span className="text-[.68rem] font-bold tracking-[.1em] text-[var(--rv-muted)] uppercase">
                    Ranking
                  </span>
                  <span className="text-[.7rem] font-semibold text-[var(--rv-muted)] tabular-nums">
                    4 Kandidaten
                  </span>
                </div>
                <div className="flex flex-col gap-[9px]">
                  {RANKING.map((r) => (
                    <div
                      key={r.rank}
                      className={`flex items-center gap-3 rounded-xl px-2.5 py-2 ${r.top ? "bg-[rgba(22,199,124,.10)]" : ""}`}
                    >
                      <span className="w-4 flex-none text-[.72rem] font-extrabold text-[var(--rv-muted)] tabular-nums">
                        {r.rank}
                      </span>
                      <span
                        className={`h-7 w-7 flex-none rounded-full ${r.top ? "bg-[image:var(--rv-gradient)]" : "bg-[rgba(12,26,22,.10)]"}`}
                      />
                      <span className="flex min-w-0 flex-1 flex-col gap-[5px]">
                        <span className="block h-[6px] w-[76%] rounded-full bg-[rgba(12,26,22,.20)]" />
                        <span className="block h-[4px] w-[50%] rounded-full bg-[rgba(12,26,22,.10)]" />
                      </span>
                      <span className="flex flex-none items-center gap-2">
                        <span className="hidden h-1.5 w-[52px] overflow-hidden rounded-full bg-[rgba(12,26,22,.10)] sm:block">
                          <span
                            className="block h-full rounded-full bg-[image:var(--rv-gradient)]"
                            style={{ width: `${r.score}%` }}
                          />
                        </span>
                        <b className="text-[.8rem] font-extrabold text-[var(--rv-ink)] tabular-nums">{r.score}%</b>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="absolute bottom-[6%] left-[4%] flex flex-wrap gap-2">
                {REVETLY_CHIPS.map((c) => (
                  <span
                    key={c.label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(22,199,124,.30)] bg-white/85 px-2.5 py-[5px] text-[.72rem] font-semibold whitespace-nowrap text-[var(--rv-green-deep)] backdrop-blur-sm"
                  >
                    <c.icon className="h-3.5 w-3.5 flex-none" strokeWidth={2.2} />
                    {c.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Griff: nur Darstellung, die Bedienung liegt auf dem Range-Input */}
            <div
              className="pointer-events-none absolute inset-y-0 z-[2] w-px bg-white/85 shadow-[0_0_0_1px_rgba(12,26,22,.18)]"
              style={{ left: `${pos}%` }}
              aria-hidden="true"
            >
              <span className="absolute top-1/2 left-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[rgba(12,26,22,.12)] bg-white text-[var(--rv-ink)] shadow-[0_10px_26px_-10px_rgba(12,26,22,.55)]">
                <MoveHorizontal className="h-[18px] w-[18px]" strokeWidth={2.2} />
              </span>
            </div>

            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={pos}
              onChange={(e) => setPos(Number(e.target.value))}
              aria-label="Vergleich zwischen Recruiting-Chaos und Revetly-Realität"
              aria-valuetext={`${pos} Prozent Revetly-Realität sichtbar`}
              className="rv-compare-range absolute inset-0 z-[3] h-full w-full cursor-ew-resize appearance-none bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rv-green-deep)]"
            />
          </div>

          <p className="mt-3.5 text-center text-[.84rem] text-[var(--rv-muted)]">
            Regler ziehen oder mit den Pfeiltasten bewegen.
          </p>
        </div>
      </div>
    </section>
  )
}
