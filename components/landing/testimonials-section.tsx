"use client"

import { useReveal } from "@/lib/hooks/useReveal"
import { Star } from "lucide-react"

const testimonials = [
  {
    quote:
      "We stopped drowning in CVs. REVETLY reads them, scores them, and tells us who to call. The rest takes care of itself.",
    name: "Sarah M.",
    role: "HR Manager, Vienna",
    initials: "SM",
  },
  {
    quote:
      "Setup took 4 minutes. First candidates arrived before I finished my coffee. I didn't believe it until I saw it.",
    name: "Thomas K.",
    role: "Head of Recruiting, Munich",
    initials: "TK",
  },
  {
    quote:
      "The iFrame widget alone is worth the subscription. Our careers page feeds directly into REVETLY.",
    name: "Julia P.",
    role: "Talent Lead, Zürich",
    initials: "JP",
  },
  {
    quote:
      "I used to spend every Monday morning reading CVs. Now I spend it talking to candidates.",
    name: "Michael B.",
    role: "Headhunter, Frankfurt",
    initials: "MB",
  },
  {
    quote:
      "REVETLY is incredibly simple and saves our team hours every single week.",
    name: "Anna L.",
    role: "HR Director, Graz",
    initials: "AL",
  },
  {
    quote:
      "We now have instant visibility into every application. Our time-to-hire dropped by 60%.",
    name: "Stefan W.",
    role: "Founder, Berlin",
    initials: "SW",
  },
]

export function TestimonialsSection() {
  const { ref, visible } = useReveal<HTMLDivElement>()

  return (
    <section
      ref={ref}
      className="px-4 py-24 sm:px-6 lg:px-8"
      style={{ backgroundColor: "#F8F7F4" }}
    >
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <p
            className={`reveal ${visible ? "visible" : ""} font-dm-sans text-xs font-semibold uppercase tracking-[0.1em]`}
            style={{ color: "#1DB954" }}
          >
            Reviews
          </p>
          <h2
            className={`reveal ${visible ? "visible" : ""} mt-3 font-syne text-4xl font-bold sm:text-5xl`}
            style={{ color: "#0A0A0A", transitionDelay: "0.05s" }}
          >
            Don&apos;t just take our word for it.
          </h2>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              className={`reveal ${visible ? "visible" : ""} flex flex-col rounded-2xl border bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md`}
              style={{ borderColor: "#E8E8E8", transitionDelay: `${0.1 + (i % 3) * 0.1}s` }}
            >
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="h-4 w-4" style={{ color: "#1DB954", fill: "#1DB954" }} />
                ))}
              </div>
              <blockquote className="mt-4 flex-1 font-dm-sans text-base leading-relaxed" style={{ color: "#0A0A0A" }}>
                {`"${t.quote}"`}
              </blockquote>
              <div className="mt-6 flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full font-syne text-sm font-bold text-white"
                  style={{ backgroundColor: "#1DB954" }}
                >
                  {t.initials}
                </div>
                <div>
                  <p className="font-dm-sans text-sm font-semibold" style={{ color: "#0A0A0A" }}>
                    {t.name}
                  </p>
                  <p className="font-dm-sans text-xs" style={{ color: "#4A4A4A" }}>
                    {t.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
