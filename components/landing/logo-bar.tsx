"use client"

import { useReveal } from "@/lib/hooks/useReveal"

const logos = ["Logoipsum", "Logoipsum", "Logoipsum", "Logoipsum", "Logoipsum", "Logoipsum"]

export function LogoBar() {
  const ref = useReveal()

  return (
    <section ref={ref} className="rv bg-white py-14">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <p className="reveal text-center font-sans text-xs font-medium uppercase tracking-[0.1em] text-[#6B7280]">
          Trusted by recruiting teams across DACH
        </p>
        <div className="reveal mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-60">
          {logos.map((logo, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-[#0F3D2C]/30" aria-hidden="true" />
              <span className="font-sans text-lg font-semibold text-[#0F3D2C]/50">{logo}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
