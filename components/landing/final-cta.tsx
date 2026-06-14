"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowRight } from "lucide-react"
import { useReveal } from "@/lib/hooks/useReveal"
import { RevetlyLogo } from "@/components/landing/revetly-logo"

interface FinalCtaProps {
  onGetStarted: () => void
}

export function FinalCta({ onGetStarted }: FinalCtaProps) {
  const ref = useReveal()

  return (
    <section ref={ref} className="rv bg-white px-5 py-20 sm:px-6 lg:px-8 lg:py-28">
      <div className="reveal mx-auto grid max-w-7xl overflow-hidden rounded-[2rem] bg-[#081314] lg:grid-cols-2">
        {/* Copy */}
        <div className="flex flex-col justify-center p-9 sm:p-12 lg:p-14">
          <div className="mb-8">
            <RevetlyLogo dark />
          </div>
          <h2 className="font-sans text-3xl font-bold leading-tight text-white text-balance sm:text-4xl">
            Take the first step toward faster, smarter hiring.
          </h2>
          <p className="mt-5 max-w-md font-sans text-base leading-relaxed text-[#7AABB2]">
            Start using REVETLY today and confirm your first interview before the
            week is out.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 rounded-full bg-[#4EB0BE] px-6 py-3.5 font-sans text-sm font-semibold text-white transition-all duration-200 hover:bg-[#2B6169]"
            >
              Start Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              onClick={onGetStarted}
              className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3.5 font-sans text-sm font-semibold text-white transition-colors duration-200 hover:bg-white/10"
            >
              Book a Demo
            </button>
          </div>
          <p className="mt-7 font-sans text-xs text-[#7AABB2]">
            DSGVO-compliant · EU servers · Cancel anytime · No credit card
          </p>
        </div>

        {/* Image */}
        <div className="relative min-h-[280px]">
          <Image
            src="/images/hr-cta-woman.png"
            alt="Build your dream team with REVETLY"
            fill
            className="object-cover"
          />
        </div>
      </div>
    </section>
  )
}
