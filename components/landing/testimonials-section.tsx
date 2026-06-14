"use client"

import Image from "next/image"
import { Star } from "lucide-react"
import { useReveal } from "@/lib/hooks/useReveal"

const testimonials = [
  {
    quote:
      "The AI matching saved us so much time. We found the right candidates faster than ever before.",
    name: "Emily C.",
    role: "HR Manager",
    avatar: "/images/hr-avatar-emily.png",
  },
  {
    quote:
      "Setup took 4 minutes. Applications were flowing in before I finished my coffee.",
    name: "Thomas K.",
    role: "Head of Recruiting",
    avatar: "/images/hr-avatar-thomas.png",
  },
  {
    quote:
      "The iFrame widget alone is worth the subscription. Game changer.",
    name: "Julia P.",
    role: "Talent Lead",
    avatar: "/images/hr-avatar-julia.png",
  },
]

export function TestimonialsSection() {
  const ref = useReveal()

  return (
    <section id="testimonials" ref={ref} className="rv bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="reveal rv-eyebrow inline-block rounded-full border border-[#E5E9E7] bg-[#F4F7F5] px-3 py-1 text-[#4EB0BE]">
            Testimonials
          </span>
          <h2 className="reveal mt-5 font-sans text-3xl font-bold leading-tight tracking-tight text-[#0F3D2C] text-balance sm:text-4xl">
            You&apos;re in good company.
          </h2>
          <p className="reveal mt-3 font-sans text-base text-[#6B7280]">
            You don&apos;t have to take our word for it.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              className="reveal flex flex-col rounded-2xl border border-[#E5E9E7] bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              data-delay={i * 110}
            >
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="h-4 w-4 fill-[#4EB0BE] text-[#4EB0BE]" />
                ))}
              </div>
              <blockquote className="mt-4 flex-1 font-sans text-base leading-relaxed text-[#0F3D2C]">
                {`"${t.quote}"`}
              </blockquote>
              <div className="mt-6 flex items-center gap-3">
                <Image
                  src={t.avatar || "/placeholder.svg"}
                  alt={t.name}
                  width={44}
                  height={44}
                  className="h-11 w-11 rounded-full object-cover"
                />
                <div>
                  <p className="font-sans text-sm font-bold text-[#0F3D2C]">{t.name}</p>
                  <p className="font-sans text-xs text-[#6B7280]">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
