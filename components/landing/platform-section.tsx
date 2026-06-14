"use client"

import { ArrowUpRight, ScanSearch, Mail, Mic, CalendarCheck } from "lucide-react"
import { useReveal } from "@/lib/hooks/useReveal"

const features = [
  {
    icon: ScanSearch,
    title: "AI CV Matching",
    body: "Every application read and scored across 9 categories — automatically.",
  },
  {
    icon: Mail,
    title: "Email Inbound Automation",
    body: "A unique inbox per job. Applications parsed and sorted on arrival.",
  },
  {
    icon: Mic,
    title: "Voice Screening",
    body: "AI-led first screening calls that surface the strongest candidates.",
  },
  {
    icon: CalendarCheck,
    title: "Auto Scheduling",
    body: "Interviews booked and confirmed without a single back-and-forth email.",
  },
]

export function PlatformSection() {
  const ref = useReveal()

  return (
    <section id="features" ref={ref} className="rv bg-[#F4F7F5] py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="reveal mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#0F3D2C] text-white">
            <ArrowUpRight className="h-5 w-5" />
          </span>
          <h2 className="reveal mt-6 font-sans text-3xl font-bold leading-tight tracking-tight text-[#0F3D2C] text-balance sm:text-4xl lg:text-[2.75rem]">
            Platform designed to simplify and automate your entire hiring
            process.
          </h2>
          <p className="reveal mx-auto mt-5 max-w-xl font-sans text-base leading-relaxed text-[#3F4A45]">
            With AI-powered automation tailored to your roles, REVETLY connects
            you with the best talent quickly and efficiently — helping you build
            stronger teams.
          </p>
          <div className="reveal mt-7">
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-full bg-[#0F3D2C] px-5 py-2.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#0B3023]"
            >
              About REVETLY
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="reveal group rounded-2xl border border-[#E5E9E7] bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              data-delay={i * 90}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF8EF] text-[#1DB954] transition-colors group-hover:bg-[#1DB954] group-hover:text-white">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 font-sans text-lg font-bold text-[#0F3D2C]">{f.title}</h3>
              <p className="mt-2 font-sans text-sm leading-relaxed text-[#6B7280]">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
