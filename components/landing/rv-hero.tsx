"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { Check, Play } from "lucide-react"

import { RvArrowIcon, RvButton } from "./rv-button"

const HEADLINE: Array<{ text: string; gradient?: boolean }> = [
  { text: "Lade" },
  { text: "Job" },
  { text: "&" },
  { text: "CVs" },
  { text: "hoch –" },
  { text: "finde" },
  { text: "in" },
  { text: "Minuten" },
  { text: "die" },
  { text: "Top-Kandidaten.", gradient: true },
]

const TRUST_ITEMS = ["DSGVO-konform", "EU AI Act", "Server in Deutschland"]

/**
 * Full-bleed Ken-Burns hero (index.html .hero): background photo drift,
 * teal scrim, floating paper shards, word-by-word blur-reveal headline,
 * lerped scroll parallax on the background/paper layers.
 */
export function RvHero() {
  const bgRef = useRef<HTMLDivElement>(null)
  const papersRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    let cur = 0
    let target = 0
    let raf: number | null = null

    const step = () => {
      cur += (target - cur) * 0.09
      if (bgRef.current) bgRef.current.style.transform = `translateY(${(cur * 0.1).toFixed(2)}px)`
      if (papersRef.current) papersRef.current.style.transform = `translateY(${(-cur * 0.16).toFixed(2)}px)`
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
      <div ref={bgRef} className="rv-hero-bg absolute inset-0 z-0 overflow-hidden">
        <img
          src="/revetly/hero-1800.jpg"
          srcSet="/revetly/hero-1100.jpg 1100w, /revetly/hero-1800.jpg 1800w"
          sizes="100vw"
          width={1800}
          height={746}
          alt=""
          role="presentation"
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="h-full w-full object-cover"
          style={{ objectPosition: "74% center", transformOrigin: "70% 40%" }}
        />
      </div>
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(90deg, rgba(16,44,41,.94) 0%, rgba(18,48,45,.82) 24%, rgba(22,56,52,.42) 46%, rgba(22,56,52,.06) 64%, transparent 78%), linear-gradient(180deg, rgba(16,44,41,.30) 0%, transparent 22%, transparent 72%, rgba(12,30,28,.46) 100%)",
        }}
      />
      <div ref={papersRef} className="pointer-events-none absolute inset-0 z-[2] overflow-hidden" aria-hidden="true">
        <div className="rv-paper p1" />
        <div className="rv-paper p2" />
        <div className="rv-paper p3" />
        <div className="rv-paper p4" />
      </div>

      <div className="relative z-[3] mx-auto flex min-h-[clamp(620px,100dvh,960px)] max-w-[1200px] items-center px-4 pt-[clamp(120px,14dvh,168px)] pb-[clamp(64px,8dvh,104px)] sm:px-6 lg:px-8">
        <div className="max-w-[560px]">
          <span className="mb-[30px] inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-[15px] py-[7px] text-[.78rem] font-semibold text-white/92 backdrop-blur-[10px]">
            <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-[var(--rv-green)]" />
            10 Matches gratis &middot; kein Account n&ouml;tig
          </span>
          <h1 className="mb-[22px] text-[clamp(2.5rem,5.4vw,4rem)] leading-[1.04] font-extrabold tracking-[-0.03em] text-white [text-shadow:0_2px_30px_rgba(8,22,20,.35)]">
            {HEADLINE.map((w, i) => (
              <span key={i}>
                <span
                  className={`rv-hw ${w.gradient ? "rv-gradient-text" : ""}`}
                  style={{ animationDelay: `${0.05 + i * 0.07}s` }}
                >
                  {w.text}
                </span>{" "}
              </span>
            ))}
          </h1>
          <p className="mb-[34px] max-w-[496px] text-[clamp(1rem,1.25vw,1.12rem)] leading-[1.65] text-white/74">
            Revetly matcht CV und Anschreiben gemeinsam und zeigt dir mit einem
            erkl&auml;rbaren Score, wer wirklich zu deiner Stelle passt – ohne Black Box,
            ohne Handarbeit.
          </p>
          <div className="flex flex-wrap gap-3">
            <RvButton variant="grad" size="lg" asChild>
              <Link href="/auth/register">
                Jetzt kostenlos starten
                <RvArrowIcon />
              </Link>
            </RvButton>
            <RvButton
              variant="ghostLight"
              size="lg"
              onClick={() => document.querySelector("#how")?.scrollIntoView({ behavior: "smooth" })}
            >
              <Play className="h-4 w-4" fill="currentColor" />
              So funktioniert&apos;s
            </RvButton>
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
