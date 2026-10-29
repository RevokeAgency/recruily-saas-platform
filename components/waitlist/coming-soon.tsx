"use client"

import { Fragment, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Check } from "lucide-react"

import { HEADLINE, TRUST_ITEMS } from "@/components/landing/rv-hero"
import { LoginModal } from "@/components/landing/login-modal"
import { RvButton } from "@/components/landing/rv-button"
import { createClient } from "@/lib/supabase/client"

import { WaitlistForm } from "./waitlist-form"

// ─────────────────────────────────────────────────────────────────────────────
// Startseite vor dem Launch (NEXT_PUBLIC_LAUNCH_MODE=waitlist, lib/launch.ts).
// Derselbe Hero wie auf der Landing: Foto, Abdunklung, Überschrift, nur statt
// des Test-Knopfs das Feld für die Warteliste. Keine neuen Gestaltungsmittel.
//
// Anmelden bleibt möglich: Wer schon ein Konto hat (Team, Testkunden), kommt
// über den Knopf oben oder über /?anmelden=1 hierher, wohin der Proxy (proxy.ts)
// geschützte Seiten ohne Sitzung schickt.
// ─────────────────────────────────────────────────────────────────────────────

export function ComingSoon() {
  const [loginOpen, setLoginOpen] = useState(false)
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has("anmelden")) {
      setLoginOpen(true)
      params.delete("anmelden")
      const rest = params.toString()
      window.history.replaceState(null, "", rest ? `/?${rest}` : "/")
    }
    createClient()
      .auth.getSession()
      .then(({ data }) => setSignedIn(!!data.session))
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-[#295f5a] font-sans">
      <header className="fixed inset-x-0 top-4 z-[100] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between rounded-[20px] border border-white/55 bg-white/62 pr-3 pl-4 shadow-[0_16px_44px_-20px_rgba(12,26,22,.40),inset_0_1px_0_rgba(255,255,255,.65)] backdrop-blur-xl backdrop-saturate-[1.7]">
          <Link href="/" aria-label="Revetly Startseite" className="inline-flex items-center">
            <Image src="/revetly/logo-520.webp" alt="Revetly" width={129} height={32} className="h-7 w-auto" priority />
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/blog"
              className="rounded-[11px] px-3.5 py-2 text-sm font-semibold text-[#2C3D38] transition-colors hover:bg-[rgba(12,26,22,.055)] hover:text-[#0C1A16]"
            >
              Blog
            </Link>
            {signedIn ? (
              <RvButton variant="blue" size="sm" asChild>
                <Link href="/dashboard">Zum Dashboard</Link>
              </RvButton>
            ) : (
              <RvButton variant="blue" size="sm" onClick={() => setLoginOpen(true)}>
                Anmelden
              </RvButton>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden bg-[#295f5a]">
          <div className="rv-hero-bg absolute inset-0 z-0 overflow-hidden lg:left-[14%]">
            <img
              src="/revetly/hero-2048.webp"
              srcSet="/revetly/hero-828.webp 828w, /revetly/hero-1280.webp 1280w, /revetly/hero-2048.webp 2048w"
              sizes="(max-aspect-ratio: 16/9) 178vh, (min-width: 1024px) 86vw, 100vw"
              width={2048}
              height={1152}
              alt=""
              role="presentation"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="h-full w-full object-cover"
              style={{ objectPosition: "40% center", transformOrigin: "70% 40%" }}
            />
          </div>
          {/* Auf dem Handy liegt der Text über dem ganzen Foto. Die zweite,
              stärkere Abdunklung unten hält Feld und Hinweis dort lesbar. */}
          <div
            className="absolute inset-0 z-[1]"
            style={{
              background:
                "linear-gradient(90deg, rgba(16,44,41,.94) 0%, rgba(18,48,45,.82) 24%, rgba(22,56,52,.42) 46%, rgba(22,56,52,.06) 64%, transparent 78%), linear-gradient(180deg, rgba(16,44,41,.30) 0%, transparent 22%, transparent 60%, rgba(12,30,28,.62) 100%)",
            }}
          />
          <div className="relative z-[3] mx-auto flex min-h-[100dvh] max-w-[1200px] flex-col px-4 pt-[clamp(112px,13dvh,160px)] sm:px-6 lg:px-8">
            <div className="flex flex-1 items-center pb-12">
              <div className="max-w-[720px]">
                <span className="mb-[24px] inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-[15px] py-[7px] text-[.78rem] font-semibold text-white/92 backdrop-blur-[10px]">
                  <span className="h-[7px] w-[7px] rounded-full bg-[var(--rv-green)]" />
                  <span>
                    Bald verfügbar
                    <span className="hidden sm:inline">{" · KI-Recruiting-Assistent für den DACH-Raum"}</span>
                  </span>
                </span>
                <h1 className="mb-[22px] flex flex-wrap items-baseline gap-x-[0.26em] text-[clamp(2.4rem,5vw,3.75rem)] leading-[1.04] font-extrabold tracking-[-0.03em] text-white [filter:drop-shadow(0_1px_2px_rgba(8,22,20,.5))_drop-shadow(0_6px_24px_rgba(8,22,20,.4))]">
                  {HEADLINE.map((w, i) => (
                    <Fragment key={i}>
                      <span
                        className={`rv-hw ${w.gradient ? "rv-gradient-text" : ""}`}
                        style={{ animationDelay: `${0.05 + i * 0.07}s` }}
                      >
                        {w.text}
                      </span>
                      {i < HEADLINE.length - 1 && " "}
                      {w.break && <span aria-hidden className="h-0 basis-full" />}
                    </Fragment>
                  ))}
                </h1>
                <p className="mb-[28px] max-w-[520px] text-[clamp(1rem,1.25vw,1.12rem)] leading-[1.65] text-white/74">
                  Revetly liest jede Bewerbung, prüft die Passung mit Beleg, bucht die Termine und schreibt
                  die Absagen. Die Entscheidung, wen du einstellst, bleibt immer deine. Trag dich ein, dann
                  sagen wir dir Bescheid, sobald du starten kannst.
                </p>
                <WaitlistForm />
                <div className="mt-[26px] flex flex-wrap items-center gap-x-[22px] gap-y-2">
                  {TRUST_ITEMS.map((item) => (
                    <div key={item} className="flex items-center gap-1.5 text-[.75rem] font-semibold text-white/60">
                      <Check className="h-[13px] w-[13px] flex-none text-[var(--rv-green)]" strokeWidth={2.5} />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-t border-white/14 py-6 text-[.82rem] text-white/60">
              <span>&copy; 2026 Revetly</span>
              <nav aria-label="Rechtliches" className="flex flex-wrap gap-x-[18px] gap-y-1">
                <Link href="/blog" className="hover:text-white">Blog</Link>
                <a href="mailto:hallo@revetly.ai" className="hover:text-white">hallo@revetly.ai</a>
                <Link href="/datenschutz" className="hover:text-white">Datenschutz</Link>
                <Link href="/impressum" className="hover:text-white">Impressum</Link>
              </nav>
            </footer>
          </div>
        </section>
      </main>

      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} showRegister={false} />
    </div>
  )
}
