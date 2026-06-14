"use client"

import Link from "next/link"
import Image from "next/image"
import { useReveal } from "@/lib/hooks/useReveal"

const steps = [
  {
    n: "1",
    title: "Create a Job",
    body: "Add title and requirements. REVETLY generates your unique application inbox instantly.",
  },
  {
    n: "2",
    title: "Applications Flow In",
    body: "Via email, apply link, or iFrame — every CV lands automatically in the right container.",
  },
  {
    n: "3",
    title: "Interview Confirmed",
    body: "AI scores candidates, contacts the best ones, schedules interviews. You show up. Nothing else.",
  },
]

export function HowItWorks() {
  const ref = useReveal()

  return (
    <section id="how-it-works" ref={ref} className="rv relative overflow-hidden bg-[#0F3D2C] py-20 lg:py-28">
      {/* subtle grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <span className="reveal rv-eyebrow inline-block rounded-full border border-white/20 px-3 py-1 text-[#7FE3A1]">
          How it works
        </span>
        <h2 className="reveal mt-5 max-w-2xl font-sans text-3xl font-bold leading-tight tracking-tight text-white text-balance sm:text-4xl">
          Efficient process from application to confirmed interview.
        </h2>
        <p className="reveal mt-4 max-w-xl font-sans text-base leading-relaxed text-[#B8CCC2]">
          We tailor an automated recruiting flow around your roles — so the
          right candidates surface and the busywork disappears.
        </p>

        {/* Steps */}
        <div className="mt-14 grid gap-10 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.n} className="reveal" data-delay={i * 120}>
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 font-sans text-sm font-bold text-white">
                {s.n}
              </span>
              <div className="mt-5 h-px w-full bg-white/15" />
              <h3 className="mt-5 font-sans text-lg font-bold text-white">{s.title}</h3>
              <p className="mt-2 font-sans text-sm leading-relaxed text-[#B8CCC2]">{s.body}</p>
            </div>
          ))}
        </div>

        {/* Wide image card with overlay CTA */}
        <div className="reveal relative mt-14 overflow-hidden rounded-3xl">
          <Image
            src="/images/hr-howitworks-man.png"
            alt="Recruiter working with REVETLY"
            width={1200}
            height={520}
            className="h-80 w-full object-cover sm:h-96"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B3023]/85 via-[#0B3023]/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-6 pb-10 text-center">
            <h3 className="max-w-xl font-sans text-2xl font-bold text-white text-balance sm:text-3xl">
              Get started with REVETLY today and discover a smarter, faster way
              to hire.
            </h3>
            <Link
              href="/auth/register"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-sans text-sm font-semibold text-[#0F3D2C] transition-transform hover:scale-[1.03]"
            >
              Find your talent
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
