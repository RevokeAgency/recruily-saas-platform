"use client"

import { useReveal } from "@/lib/hooks/useReveal"
import { RvCard } from "./rv-card"

// Früher stand an dieser Stelle eine Kundenstimmen-Sektion mit erfundenen
// Zitaten. Erfundene Referenzen sind in Österreich und der EU unlautere
// Werbung (UWG-Anhang, Richtlinie 2005/29/EG). Solange es keine echten gibt,
// steht hier, für wen Revetly gebaut ist.
//
// Die Segmente sind nach der Größe des Stapels pro Stelle geschnitten, nicht
// nach Unternehmensgröße. Genau das zeigen die Grafiken: jede die Form des
// Stapels, mit dem diese Gruppe arbeitet. Das Blatt-Motiv ist dasselbe wie
// bei den Zetteln im Vorher-Nachher-Slider oben.

type Stack = { sheets: number; ranked?: boolean }
type Pile = { stacks: Stack[]; width: number; pool?: boolean }

const SEGMENTE: Array<{ title: string; text: string; pile: Pile }> = [
  {
    title: "Personaldienstleister und Recruiter.",
    text: "Viele Mandate gleichzeitig, jede Woche neue Stellen. Revetly gleicht jedes neue Mandat gegen deinen bestehenden Pool ab, bevor du neu suchst.",
    // Mehrere Mandate auf einem gemeinsamen Sockel: dem bestehenden Pool.
    pile: { stacks: [{ sheets: 5 }, { sheets: 8 }, { sheets: 4 }, { sheets: 7 }], width: 34, pool: true },
  },
  {
    title: "Unternehmen mit vielen offenen Stellen.",
    text: "Jede Stelle bekommt ihre eigene Bewerbungsseite und ihr eigenes Ranking. Du behältst den Überblick, auch wenn zwanzig Stellen gleichzeitig laufen.",
    // Viele Stellen, jede mit eigenem Ranking: das beste Blatt obenauf.
    pile: {
      stacks: [{ sheets: 5 }, { sheets: 7 }, { sheets: 4 }, { sheets: 6 }, { sheets: 8 }, { sheets: 5 }].map((s) => ({ ...s, ranked: true })),
      width: 20,
    },
  },
  {
    title: "Betriebe mit einer Stelle und vollem Posteingang.",
    text: "Eine Anzeige, sechzig Bewerbungen, keine Personalabteilung. Revetly sortiert, du führst die Gespräche.",
    // Eine Stelle, ein hoher Stapel, oben das beste Profil.
    pile: { stacks: [{ sheets: 11, ranked: true }], width: 68 },
  },
]

// Kleine, feste Versätze, damit die Stapel gelegt aussehen und nicht
// gezeichnet. Fest statt zufällig, damit Server und Browser dasselbe rendern.
const JITTER = [0, 2, -1, 1, -2, 1, 0, -1, 2, -1, 1, 0, -2]

function PileGraphic({ pile }: { pile: Pile }) {
  return (
    <div
      className="flex h-[112px] flex-col items-center justify-end rounded-2xl border border-[rgba(12,26,22,.06)] bg-[var(--rv-mist)] px-4 pb-4"
      aria-hidden="true"
    >
      <div className="flex items-end gap-2.5">
        {pile.stacks.map((stack, si) => (
          <div
            key={si}
            className="rv-pile flex flex-col-reverse gap-[2px]"
            style={{ ["--d" as string]: `${0.3 + si * 0.07}s` }}
          >
            {Array.from({ length: stack.sheets }).map((_, i) => {
              const top = i === stack.sheets - 1
              return (
                <span
                  key={i}
                  className={`block h-[5px] rounded-[2px] ${
                    top && stack.ranked
                      ? "bg-[image:var(--rv-gradient)]"
                      : "border border-[rgba(12,26,22,.24)] bg-white"
                  }`}
                  style={{
                    width: pile.width,
                    transform: `translateX(${JITTER[(i + si * 3) % JITTER.length]}px)`,
                  }}
                />
              )
            })}
          </div>
        ))}
      </div>
      {pile.pool && (
        <span className="rv-pile mt-[3px] block h-[7px] w-full rounded-[3px] bg-[rgba(12,26,22,.14)]" style={{ ["--d" as string]: "0.25s" }} />
      )}
    </div>
  )
}

export function RvAudience() {
  const ref = useReveal()

  return (
    <section id="zielgruppen" ref={ref} className="relative overflow-hidden bg-white py-[clamp(72px,9vw,130px)]">
      <div className="rv-patternbg" data-pattern="grid" />
      <div className="relative z-[1] mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="reveal mx-auto max-w-[680px] text-center" data-dir="scale">
          <span className="rv-eyebrow inline-flex items-center gap-2 rounded-full border border-[rgba(12,26,22,.10)] bg-white px-3.5 py-[7px] text-[var(--rv-ink-soft)] shadow-[var(--rv-shadow-sm)] before:h-[7px] before:w-[7px] before:rounded-full before:bg-[image:var(--rv-gradient)]">
            Für wen wir bauen
          </span>
          <h2 className="mt-[22px] text-[clamp(1.9rem,3.6vw,2.7rem)] leading-[1.12] font-bold tracking-[-0.025em] text-balance text-[var(--rv-ink)]">
            Für alle, die mehr Bewerbungen bekommen, <span className="rv-gradient-text">als sie lesen können.</span>
          </h2>
          <p className="mx-auto mt-[18px] max-w-[540px] text-[clamp(1rem,1.25vw,1.12rem)] leading-[1.65] text-[var(--rv-muted)]">
            Entscheidend ist nicht die Größe deines Unternehmens, sondern der Stapel pro Stelle.
          </p>
        </div>

        <div className="mt-[52px] grid grid-cols-1 gap-5 md:grid-cols-3">
          {SEGMENTE.map((s, i) => (
            <RvCard
              key={s.title}
              tilt
              spotlight
              className={`reveal s${i + 1} flex flex-col p-[16px_16px_28px]`}
              data-dir={i === 0 ? "left" : i === 2 ? "right" : "scale"}
            >
              <PileGraphic pile={s.pile} />
              <h3 className="mt-6 px-3 text-[1.12rem] leading-[1.35] font-bold tracking-[-0.02em] text-[var(--rv-ink)]">{s.title}</h3>
              <p className="mt-3 px-3 text-[.9rem] leading-[1.62] text-[var(--rv-muted)]">{s.text}</p>
            </RvCard>
          ))}
        </div>
      </div>
    </section>
  )
}
