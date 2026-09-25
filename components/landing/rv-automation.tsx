"use client"

import { CalendarCheck, MailCheck, Users } from "lucide-react"

import { useReveal } from "@/lib/hooks/useReveal"

// Die drei Dinge, die nebenher laufen. Dieselbe Reihenfolge wie im Verlauf
// daneben, damit sich Beschreibung und Beispiel eins zu eins zuordnen lassen.
const ITEMS = [
  {
    icon: MailCheck,
    title: "Absagen.",
    text: "Persönlich formuliert und auf Knopfdruck verschickt. Niemand wartet wochenlang.",
  },
  {
    icon: CalendarCheck,
    title: "Terminbuchung.",
    text: "Bewerber sehen deine freien Zeiten und buchen selbst. Der Termin landet mit Videolink in deinem Google- oder Microsoft-Kalender.",
  },
  {
    icon: Users,
    title: "Talent-Pool.",
    text: "Neue Stellen gleicht Revetly gegen frühere Bewerber ab. Wer letztes Mal knapp nicht gepasst hat, taucht von selbst wieder auf.",
  },
]

// Beispielverlauf, keine echten Daten. Neueste Meldung oben, wie im
// Aktivitäts-Verlauf des Dashboards. Eingeblendet wird in umgekehrter
// Reihenfolge (die älteste zuerst), damit die neueste zuletzt eintrifft und
// oben landet. Dieselbe Reihenfolge der Inhalte wie ITEMS.
const FEED = [
  { icon: MailCheck, title: "Absage an Jonas Berger verschickt", meta: "Frontend Dev · persönlich formuliert", time: "09:14" },
  { icon: CalendarCheck, title: "Lena Maier hat einen Termin gebucht", meta: "Mi, 10:30 · Videolink im Kalender", time: "09:02" },
  { icon: Users, title: "3 frühere Bewerber passen zur neuen Stelle", meta: "Talent-Pool · Backend Dev", time: "08:47" },
]

export function RvAutomation() {
  const ref = useReveal()

  return (
    <section id="automatisch" ref={ref} className="relative overflow-hidden bg-[var(--rv-mist)] py-[clamp(72px,9vw,130px)]">
      <div className="rv-patternbg" data-pattern="diagonal" />
      {/* Gespiegelt zur Gesprächs-Sektion (dort Text links, Beispiel rechts):
          Das Zickzack hält die Seite in Bewegung, statt zwei gleich gebaute
          Sektionen aufeinander folgen zu lassen. Mobil steht der Text oben. */}
      <div className="relative z-[1] mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20 lg:px-8">
        {/* Beispiel und Schlusszeile teilen sich die linke Spalte. Allein war die
            Karte deutlich niedriger als Überschrift plus Liste daneben und
            schwamm mittig in leerem Raum. */}
        <div className="order-2 flex flex-col gap-9 lg:order-1">
          <figure
            className="reveal overflow-hidden rounded-[var(--rv-radius-lg)] border border-[rgba(12,26,22,.10)] bg-white shadow-[var(--rv-shadow)]"
            data-dir="left"
          >
            <figcaption className="sr-only">
              Beispiel eines Aktivitätsverlaufs: eine verschickte Absage, ein gebuchter Termin und ein
              Treffer aus dem Talent-Pool, ohne dass jemand eingreifen musste.
            </figcaption>
            <div className="flex items-center justify-between gap-4 border-b border-[rgba(12,26,22,.10)] bg-[var(--rv-mist-2)] px-[24px] py-[16px]" aria-hidden="true">
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 flex-none rounded-full bg-[var(--rv-green)]" />
                <div>
                  <div className="text-[.74rem] font-semibold tracking-[.06em] text-[var(--rv-muted)] uppercase">Im Hintergrund</div>
                  <div className="mt-0.5 text-[.95rem] font-bold text-[var(--rv-ink)]">Heute</div>
                </div>
              </div>
              <span className="rounded-full border border-[rgba(12,26,22,.12)] bg-white px-2.5 py-1 text-[.64rem] font-bold tracking-[.08em] text-[var(--rv-muted)] uppercase">
                Beispiel
              </span>
            </div>
            <ul className="flex flex-col p-2" aria-hidden="true">
              {FEED.map((f, i) => (
                <li
                  key={f.title}
                  className="rv-feed-item flex items-center gap-3.5 rounded-2xl px-4 py-3.5"
                  style={{ ["--d" as string]: `${0.45 + (FEED.length - 1 - i) * 0.3}s` }}
                >
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[rgba(22,199,124,.12)] text-[var(--rv-green-deep)]">
                    <f.icon className="h-[18px] w-[18px]" strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[.9rem] leading-[1.35] font-semibold text-[var(--rv-ink)] sm:truncate">{f.title}</span>
                    <span className="mt-0.5 block text-[.78rem] text-[var(--rv-muted)] sm:truncate">{f.meta}</span>
                  </span>
                  <span className="flex-none text-[.74rem] font-semibold text-[var(--rv-muted)] tabular-nums">{f.time}</span>
                </li>
              ))}
            </ul>
          </figure>
          {/* Schlusszeile als ruhiges Zitat statt weißer Box: Die Box sah aus
              wie ein Eingabefeld oder ein Hinweis, der Satz ist aber ein
              Gedanke, kein Element. */}
          <p className="reveal s2 border-l-2 border-[var(--rv-green)] pl-5 text-[clamp(.98rem,1.25vw,1.08rem)] leading-[1.65] text-[var(--rv-ink-soft)]" data-dir="left">
            Auch deine Bewerber merken den Unterschied: eine schnelle Antwort, eine klare Absage,
            ein Termin nach Wahl. Und die Guten sind noch da, wenn du dich entscheidest.
          </p>
        </div>

        <div className="order-1 lg:order-2">
          <div className="reveal" data-dir="right">
            <span className="rv-eyebrow inline-flex items-center gap-2 rounded-full border border-[rgba(12,26,22,.10)] bg-white px-3.5 py-[7px] text-[var(--rv-ink-soft)] shadow-[var(--rv-shadow-sm)] before:h-[7px] before:w-[7px] before:rounded-full before:bg-[image:var(--rv-gradient)]">
              Automatisch
            </span>
            <h2 className="mt-[22px] text-[clamp(1.9rem,3.6vw,2.7rem)] leading-[1.12] font-bold tracking-[-0.025em] text-[var(--rv-ink)]">
              Der Rest läuft <span className="rv-gradient-text">nebenher.</span>
            </h2>
          </div>

          {/* Derselbe Listenstil wie die drei Punkte der Match Analyse:
              dunkles Icon-Kästchen, fetter Satzanfang, ruhiger Text. */}
          <ul className="mt-9 flex flex-col gap-7">
            {ITEMS.map((item, i) => (
              <li key={item.title} className={`reveal s${i + 1} flex gap-4`} data-dir="right">
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-[var(--rv-ink)] text-white">
                  <item.icon className="h-[19px] w-[19px]" strokeWidth={2.1} />
                </div>
                <div>
                  <h3 className="text-[1.05rem] leading-[1.35] font-bold tracking-[-0.02em] text-[var(--rv-ink)]">{item.title}</h3>
                  <p className="mt-1.5 text-[.92rem] leading-[1.62] text-[var(--rv-muted)]">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
