"use client"

import { Fragment, useEffect, useRef } from "react"
import Link from "next/link"
import { Check } from "lucide-react"

import { RvArrowIcon, RvButton } from "./rv-button"
import { PLANS } from "@/lib/plans"

// `break` setzt nach dem Wort einen erzwungenen Zeilenumbruch: ein leeres
// Element mit basis-full in der flex-wrap-Zeile. So steht "Von 100
// Bewerbungen" oben und das Ziel darunter, und der Verlauf liegt auf dem Ziel.
// Die "100" ist ein Bild für den Stapel, keine Leistungszahl.
//
// Spaltenbreite und Schriftgröße sind auf die längere Zeile abgestimmt:
// "zur richtigen Einstellung." braucht bei 64 px gut 718 px, die Spalte hatte
// 620. Mit 60 px und 720 px Spalte steht sie auf dem Desktop in einer Zeile.
// Nur die Spalte zu verbreitern hätte die Schrift weiter ins Foto geschoben.
const HEADLINE: Array<{ text: string; gradient?: boolean; break?: boolean }> = [
  { text: "Von" },
  { text: "100" },
  { text: "Bewerbungen", break: true },
  { text: "zur", gradient: true },
  { text: "richtigen", gradient: true },
  { text: "Einstellung.", gradient: true },
]

const TRUST_ITEMS = ["Entscheidung immer beim Menschen", "Jeder Match belegt", "Verarbeitung in der EU"]

/**
 * Full-bleed Ken-Burns hero (index.html .hero): background photo drift,
 * teal scrim, word-by-word blur-reveal headline, lerped scroll parallax
 * auf der Bildebene.
 */
export function RvHero() {
  const bgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    let cur = 0
    let target = 0
    let raf: number | null = null

    const step = () => {
      cur += (target - cur) * 0.09
      if (bgRef.current) bgRef.current.style.transform = `translateY(${(cur * 0.1).toFixed(2)}px)`
      raf = Math.abs(target - cur) > 0.1 ? requestAnimationFrame(step) : null
    }
    const onScroll = () => {
      target = Math.min(window.scrollY, 800)
      if (!raf) raf = requestAnimationFrame(step)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <section className="relative isolate overflow-hidden bg-[#295f5a]">
      {/* Ab lg beginnt die Foto-Flaeche erst bei 14 Prozent statt am linken Rand.
          Das loest beide Wuensche auf einmal: Das Bild wird kleiner, und weil das
          Motiv mittig im Foto sitzt, rueckt es dadurch nach rechts. Ueber
          objectPosition allein ginge das nicht, das Foto ist kaum breiter als die
          Flaeche und hat deshalb fast keinen Verschiebespielraum.
          Die linke Kante wird in globals.css weich ausgeblendet, sonst entstuende
          dort eine sichtbare Naht zum Hintergrund. */}
      <div ref={bgRef} className="rv-hero-bg absolute inset-0 z-0 overflow-hidden lg:left-[14%]">
        {/* Liegt im Supabase-Bucket statt lokal, deshalb kein srcSet: Es gibt nur
            diese eine Groesse. Ein srcSet mit den alten Dateien wuerde das neue
            Bild ueberstimmen, w-Deskriptoren gewinnen gegen src.
            Das Bild ist das LCP-Element der Seite, der preconnect im Layout
            spart den Verbindungsaufbau zur fremden Domain.
            objectPosition haelt das Motiv rechts, damit die linke Haelfte fuer
            Ueberschrift und Text frei bleibt. Achtung, der Wert wirkt
            umgekehrt zur Intuition: Er bestimmt, welcher Punkt des Bildes auf
            den gleichen Punkt der Flaeche faellt. Kleinerer Wert heisst, dass
            mehr vom linken Bildrand zu sehen ist, das Motiv also nach rechts
            rueckt. Ein eigenes transform waere hier wirkungslos, die
            Ken-Burns-Animation in globals.css belegt die Eigenschaft bereits. */}
        <img
          src="https://wciddwedyrgwjsppzlfr.supabase.co/storage/v1/object/public/Revetly/magnific_bewerbungen-sollen-herumf_jU6Imq8LD0.png"
          alt=""
          role="presentation"
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="h-full w-full object-cover"
          style={{ objectPosition: "40% center", transformOrigin: "70% 40%" }}
        />
      </div>
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(90deg, rgba(16,44,41,.94) 0%, rgba(18,48,45,.82) 24%, rgba(22,56,52,.42) 46%, rgba(22,56,52,.06) 64%, transparent 78%), linear-gradient(180deg, rgba(16,44,41,.30) 0%, transparent 22%, transparent 72%, rgba(12,30,28,.46) 100%)",
        }}
      />
      <div className="relative z-[3] mx-auto flex min-h-[clamp(620px,100dvh,960px)] max-w-[1200px] items-center px-4 pt-[clamp(120px,14dvh,168px)] pb-[clamp(64px,8dvh,104px)] sm:px-6 lg:px-8">
        <div className="max-w-[720px]">
          <span className="mb-[30px] inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-[15px] py-[7px] text-[.78rem] font-semibold text-white/92 backdrop-blur-[10px]">
            <span className="h-[7px] w-[7px] rounded-full bg-[var(--rv-green)]" />
            KI-Recruiting-Assistent für den DACH-Raum
          </span>
          {/* Schatten als filter auf der h1, nicht als text-shadow am Wort:
              Die Verlaufswoerter fuellen ihre Glyphen per background-clip, ein
              text-shadow bliebe dort wirkungslos. Und .rv-hw animiert selbst
              schon filter, ein zweiter Wert am selben Element wuerde von der
              Einblendung ueberschrieben. Der enge Schatten gibt der Schrift
              Kante auf hellen Bildstellen, der weite ersetzt den frueheren
              Schein. */}
          <h1 className="mb-[22px] flex flex-wrap items-baseline gap-x-[0.26em] text-[clamp(2.4rem,5vw,3.75rem)] leading-[1.04] font-extrabold tracking-[-0.03em] text-white [filter:drop-shadow(0_1px_2px_rgba(8,22,20,.5))_drop-shadow(0_6px_24px_rgba(8,22,20,.4))]">
            {HEADLINE.map((w, i) => (
              <Fragment key={i}>
                <span
                  className={`rv-hw ${w.gradient ? "rv-gradient-text" : ""}`}
                  style={{ animationDelay: `${0.05 + i * 0.07}s` }}
                >
                  {w.text}
                </span>
                {w.break && <span aria-hidden className="h-0 basis-full" />}
              </Fragment>
            ))}
          </h1>
          <p className="mb-[34px] max-w-[520px] text-[clamp(1rem,1.25vw,1.12rem)] leading-[1.65] text-white/74">
            Revetly übernimmt alles zwischen Stellenanzeige und Zusage: Bewerbungen
            sammeln, Passung prüfen, Gespräche planen und strukturiert führen. Die
            Entscheidung triffst du.
          </p>
          <div className="flex flex-col items-start gap-3">
            <RvButton variant="grad" size="lg" asChild>
              <Link href="/auth/register">
                Erste Stelle kostenlos testen
                <RvArrowIcon />
              </Link>
            </RvButton>
            <p className="pl-1 text-[.8rem] font-semibold text-white/60">
              {`${PLANS.free.matches} Matches gratis · keine Kreditkarte`}
            </p>
          </div>
          <div className="mt-[30px] flex flex-wrap items-center gap-[22px]">
            {TRUST_ITEMS.map((item) => (
              <div key={item} className="flex items-center gap-1.5 text-[.75rem] font-semibold text-white/52">
                <Check className="h-[13px] w-[13px] flex-none text-[var(--rv-green)]" strokeWidth={2.5} />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rv-hero-cue absolute bottom-[26px] left-1/2 z-[3] flex -translate-x-1/2 flex-col items-center gap-[7px] text-[.68rem] font-semibold tracking-[.14em] text-white/50 uppercase">
        <span className="rv-mouse" />
        Scroll
      </div>
    </section>
  )
}
