"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowRight } from "lucide-react"

const heroLines = ["AI RECRUITING", "COPILOT FOR", "YOUR TEAM."]

const statements = [
  { word: "FAST.", desc: "From application to interview in hours, not weeks." },
  { word: "SMART.", desc: "AI that understands CVs. Not just keywords." },
  { word: "AUTOMATED.", desc: "Every step before the interview. Handled." },
]

export function HeroSection() {
  return (
    <section id="top" className="rv relative overflow-hidden bg-white px-4 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 pb-16 lg:grid-cols-[1.1fr_0.9fr] lg:pb-24">
        {/* Left: copy */}
        <div>
          <h1 className="rv-display text-[var(--rv-text)]" style={{ fontSize: "clamp(2.75rem, 7vw, 6rem)" }}>
            {heroLines.map((line, i) => (
              <span key={line} className="block overflow-hidden">
                <span
                  className="rv-fade-up inline-block"
                  style={{ animationDelay: `${0.1 + i * 0.1}s` }}
                >
                  {line}
                </span>
              </span>
            ))}
          </h1>

          <p className="rv-fade-up rv-delay-5 mt-7 max-w-md font-dm-sans text-base leading-[1.7] text-[var(--rv-text-2)] sm:text-[17px]">
            The manual work you hate — reading CVs, screening calls, scheduling interviews —
            REVETLY handles all of it. Automatically.
          </p>

          <div className="rv-fade-up rv-delay-6 mt-8">
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--rv-dark)] px-7 py-3.5 font-dm-sans text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.03] hover:bg-[#1a1a1a]"
            >
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Right: 3D shape */}
        <div className="rv-scale-in rv-delay-4 relative flex items-center justify-center lg:justify-end">
          <Image
            src="/images/rv-hero-shape.png"
            alt="REVETLY abstract 3D recruiting platform illustration"
            width={560}
            height={620}
            priority
            className="rv-float h-auto w-[72%] max-w-sm object-contain lg:w-full lg:max-w-md"
          />
        </div>
      </div>

      {/* Statement row — FAST / SMART / AUTOMATED */}
      <div className="reveal mx-auto max-w-7xl border-t border-[var(--rv-border-light)] py-12">

        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          {statements.map((s) => (
            <div key={s.word}>
              <h3 className="rv-display text-3xl text-[var(--rv-text)] sm:text-4xl">{s.word}</h3>
              <p className="mt-3 max-w-[16rem] font-dm-sans text-sm leading-relaxed text-[var(--rv-text-2)]">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
