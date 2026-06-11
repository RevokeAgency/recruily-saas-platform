"use client"

import { useReveal } from "@/lib/hooks/useReveal"

interface FinalCtaProps {
  onGetStarted: () => void
}

export function FinalCta({ onGetStarted }: FinalCtaProps) {
  const ref = useReveal<HTMLDivElement>()

  return (
    <section className="bg-[#0D1F14] px-6 py-24 md:py-32">
      <div ref={ref} className="reveal mx-auto max-w-3xl text-center">
        <h2 className="font-fraunces text-4xl font-semibold leading-tight text-white text-balance md:text-6xl">
          Your recruiting team is losing hours every week.
        </h2>
        <p className="font-syne mt-3 text-3xl font-bold text-[#1DB954] md:text-5xl">
          Get them back.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button
            onClick={onGetStarted}
            className="rv-pulse-glow w-full rounded-md bg-[#1DB954] px-8 py-4 font-dm-sans text-base font-semibold text-white transition-transform duration-200 hover:scale-[1.02] hover:bg-[#158A3E] sm:w-auto"
          >
            Get Started Free
          </button>
          <button
            onClick={onGetStarted}
            className="w-full rounded-md border border-white/30 px-8 py-4 font-dm-sans text-base font-semibold text-white transition-colors duration-200 hover:bg-white/10 sm:w-auto"
          >
            Book a Demo
          </button>
        </div>

        <p className="font-dm-sans mt-8 text-sm text-[#A8C4B0]">
          DSGVO-compliant · EU servers · Cancel anytime · No credit card
        </p>
      </div>
    </section>
  )
}
