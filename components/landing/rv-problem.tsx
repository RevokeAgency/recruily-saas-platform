"use client"

import { useState } from "react"
import { MoveHorizontal, X, Zap } from "lucide-react"

import { useReveal } from "@/lib/hooks/useReveal"

// Vorher/Nachher-Vergleich mit ziehbarem Trenner.
//
// Links das Chaos, rechts die Revetly-Seite. Beide Texte liegen in ihrer
// eigenen Haelfte, nicht ueber die volle Breite. Das ist der entscheidende
// Punkt: Wuerde der Text durchlaufen, schnitte der Trenner mitten in die
// Saetze und beide Seiten waeren gleichzeitig als Fragmente lesbar. So steht
// in der Mittelstellung links der vollstaendige Chaos-Text und rechts der
// vollstaendige Revetly-Text.
//
// Die drei Punkte sind Gegenstuecke voneinander (Posteingang gegen Ranking,
// liegengebliebene Absagen gegen Autopilot, Termin-Ping-Pong gegen Ein-Klick-
// Interview) und teilen dasselbe vertikale Raster, damit sie sich beim Ziehen
// gegenseitig abloesen.
//
// Waehrend eine Seite zusammengeschoben wird, blendet ihr Text aus, bevor er
// angeschnitten wirkt. Die dekorativen Haelften vertragen den Schnitt.
//
// Unter lg gibt es keinen Regler: Zwei Haelften waeren dort zu schmal. Die
// beiden Bloecke stehen dann einfach untereinander, Chaos zuerst.

type Item = { t: string; d: string }

const CHAOS: Item[] = [
  {
    t: "Glücksspiel im Posteingang:",
    d: "Wer als Erster schickt, wird gelesen. Wer später kommt, geht im Stapel unter.",
  },
  {
    t: "Stille Post bei Absagen:",
    d: "Rückmeldungen bleiben liegen, weil Zeit fehlt. Bewerber bleiben frustriert zurück.",
  },
  {
    t: "Termin-Ping-Pong über Tage:",
    d: "5 E-Mails für ein Erstgespräch. Der Kandidat springt genervt ab.",
  },
]

const REVETLY: Item[] = [
  {
    t: "Glasklares Ranking ab Sekunde 1:",
    d: "Eingehende Profile werden sofort analysiert und nach Passung geordnet.",
  },
  {
    t: "Wertschätzend auf Autopilot:",
    d: "Personalisierte Absagen versenden sich auf Knopfdruck, ohne Mehraufwand.",
  },
  {
    t: "Ein Klick zum Interview:",
    d: "Kandidaten wählen passende Zeiten direkt aus deinem Kalender.",
  },
]

const NOTES = [
  "left-[6%] top-[8%] w-[52%] -rotate-[8deg]",
  "left-[40%] top-[26%] w-[48%] rotate-[6deg]",
  "left-[10%] top-[48%] w-[50%] rotate-[4deg]",
  "left-[36%] top-[70%] w-[46%] -rotate-[7deg]",
]

const RANKING = [
  { rank: 1, score: 92, top: true },
  { rank: 2, score: 87, top: false },
  { rank: 3, score: 74, top: false },
]

function List({ items, chaos }: { items: Item[]; chaos: boolean }) {
  return (
    <ul className="flex flex-col">
      {items.map((it, i) => (
        <li
          key={it.t}
          className={`py-[clamp(12px,1.6vw,19px)] ${i > 0 ? "border-t border-[rgba(12,26,22,.10)]" : ""}`}
        >
          <p
            className={`text-[clamp(.9rem,1.1vw,1rem)] leading-[1.6] ${
              chaos ? "text-[rgba(12,26,22,.58)]" : "text-[var(--rv-muted)]"
            }`}
          >
            <b className={`font-bold ${chaos ? "text-[rgba(12,26,22,.76)]" : "text-[var(--rv-ink)]"}`}>{it.t}</b>{" "}
            {it.d}
          </p>
        </li>
      ))}
    </ul>
  )
}

function Header({ chaos, label }: { chaos: boolean; label: string }) {
  return (
    <div className="mb-[clamp(12px,1.6vw,20px)] flex items-center gap-2.5">
      <span
        className={`flex h-7 w-7 flex-none items-center justify-center rounded-full ${
          chaos ? "bg-[rgba(239,68,68,.12)] text-[#DC2626]" : "bg-[image:var(--rv-gradient)] text-[var(--rv-ink)]"
        }`}
      >
        {chaos ? <X className="h-4 w-4" strokeWidth={2.8} /> : <Zap className="h-[15px] w-[15px]" strokeWidth={2.6} />}
      </span>
      <h3
        className={`text-[clamp(.98rem,1.4vw,1.12rem)] font-bold tracking-[-0.015em] ${
          chaos ? "text-[rgba(12,26,22,.62)]" : "text-[var(--rv-ink)]"
        }`}
      >
        {label}
      </h3>
    </div>
  )
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

export function RvProblem() {
  const ref = useReveal()
  const [pos, setPos] = useState(50)
  // Waehrend des Ziehens ohne Uebergang, damit der Trenner am Finger klebt.
  // Bei Klick oder Pfeiltaste laeuft der Wechsel weich.
  const [dragging, setDragging] = useState(false)
  const glide = dragging ? "none" : "clip-path 280ms cubic-bezier(0.23,1,0.32,1), opacity 280ms ease"

  // Der Text der schrumpfenden Seite verschwindet, bevor er angeschnitten wirkt.
  const chaosFade = clamp01((pos - 28) / 22)
  const revFade = clamp01((72 - pos) / 22)

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
          </p>
        </div>

        <div className="reveal mt-[clamp(36px,4.5vw,56px)]">
          <div className="relative grid overflow-hidden rounded-[var(--rv-radius-lg)] border border-[rgba(12,26,22,.12)] shadow-[var(--rv-shadow)] select-none">

            {/* Chaos: liegt auf dem Desktop oben und wird von links freigegeben */}
            <div
              className="rv-compare-cut bg-[#EDEAE6] p-[clamp(22px,3vw,38px)] lg:z-[2] lg:[grid-area:1/1]"
              style={{ ["--cut" as string]: `${100 - pos}%`, transition: glide }}
            >
              <div className="grid gap-6 lg:grid-cols-2 lg:gap-0">
                <div className="rv-compare-fade lg:pr-[clamp(20px,2.5vw,34px)]" style={{ ["--fade" as string]: chaosFade }}>
                  <Header chaos label="Das alltägliche Recruiting-Chaos" />
                  <List items={CHAOS} chaos />
                </div>
                {/* Dekor: vertraegt den Schnitt, anders als Text */}
                <div className="relative hidden min-h-[210px] lg:block" aria-hidden="true">
                  {NOTES.map((cls) => (
                    <div
                      key={cls}
                      className={`absolute rounded-[6px] border border-[rgba(12,26,22,.10)] bg-white p-[9px_10px] shadow-[0_10px_22px_-14px_rgba(12,26,22,.5)] ${cls}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 flex-none rounded-full bg-[#EF4444]" />
                        <span className="h-[5px] flex-1 rounded-full bg-[rgba(12,26,22,.20)]" />
                      </div>
                      <div className="mt-1.5 flex flex-col gap-[4px]">
                        <span className="block h-[4px] w-full rounded-full bg-[rgba(12,26,22,.09)]" />
                        <span className="block h-[4px] w-[70%] rounded-full bg-[rgba(12,26,22,.09)]" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Revetly: liegt darunter, wird rechts sichtbar */}
            <div className="bg-[linear-gradient(155deg,#FFFFFF_0%,#E9F7F1_100%)] p-[clamp(22px,3vw,38px)] lg:z-[1] lg:[grid-area:1/1]">
              <div className="grid gap-6 lg:grid-cols-2 lg:gap-0">
                {/* Dekor links, Text rechts: spiegelbildlich zur Chaos-Seite */}
                <div className="hidden lg:flex lg:items-center lg:pr-[clamp(20px,2.5vw,34px)]" aria-hidden="true">
                  <div className="w-full rounded-2xl border border-[rgba(12,26,22,.10)] bg-white p-3.5 shadow-[var(--rv-shadow-sm)]">
                    <div className="mb-2 flex items-baseline justify-between px-2">
                      <span className="text-[.64rem] font-bold tracking-[.1em] text-[var(--rv-muted)] uppercase">Ranking</span>
                      <span className="text-[.66rem] font-semibold text-[var(--rv-muted)] tabular-nums">nach Passung</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {RANKING.map((r) => (
                        <div key={r.rank} className={`flex items-center gap-2.5 rounded-xl px-2 py-1.5 ${r.top ? "bg-[rgba(22,199,124,.10)]" : ""}`}>
                          <span className="w-3 flex-none text-[.68rem] font-extrabold text-[var(--rv-muted)] tabular-nums">{r.rank}</span>
                          <span className={`h-6 w-6 flex-none rounded-full ${r.top ? "bg-[image:var(--rv-gradient)]" : "bg-[rgba(12,26,22,.10)]"}`} />
                          <span className="flex min-w-0 flex-1 flex-col gap-1">
                            <span className="block h-[5px] w-[74%] rounded-full bg-[rgba(12,26,22,.18)]" />
                            <span className="block h-[3px] w-[48%] rounded-full bg-[rgba(12,26,22,.09)]" />
                          </span>
                          <b className="text-[.72rem] font-extrabold text-[var(--rv-ink)] tabular-nums">{r.score}%</b>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="rv-compare-fade" style={{ ["--fade" as string]: revFade, transition: glide }}>
                  <Header chaos={false} label="Die Revetly-Realität" />
                  <List items={REVETLY} chaos={false} />
                </div>
              </div>
            </div>

            {/* Trenner und Griff: reine Darstellung, bedient wird das Range-Input */}
            <div
              className="pointer-events-none absolute inset-y-0 z-[3] hidden w-px bg-white/90 shadow-[0_0_0_1px_rgba(12,26,22,.16)] lg:block"
              style={{ left: `${pos}%`, transition: dragging ? "none" : "left 280ms cubic-bezier(0.23,1,0.32,1)" }}
              aria-hidden="true"
            >
              <span className="rv-compare-grip absolute top-1/2 left-1/2 flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(12,26,22,.12)] bg-white text-[var(--rv-ink)] shadow-[0_10px_26px_-10px_rgba(12,26,22,.55)]">
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
              onPointerDown={() => setDragging(true)}
              onPointerUp={() => setDragging(false)}
              onPointerCancel={() => setDragging(false)}
              onBlur={() => setDragging(false)}
              aria-label="Vergleich zwischen Recruiting-Chaos und Revetly-Realität"
              aria-valuetext={`${pos} Prozent Recruiting-Chaos sichtbar`}
              className="rv-compare-range absolute inset-0 z-[4] hidden h-full w-full cursor-ew-resize appearance-none bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rv-green-deep)] lg:block"
            />
          </div>

          <p className="mt-3.5 hidden text-center text-[.84rem] text-[var(--rv-muted)] lg:block">
            Trenner ziehen oder mit den Pfeiltasten bewegen.
          </p>
        </div>
      </div>
    </section>
  )
}
