"use client"

import { useState } from "react"
import Image from "next/image"
import { Check, ArrowUpRight } from "lucide-react"
import { useReveal } from "@/lib/hooks/useReveal"

const tabs = [
  {
    id: "email",
    label: "Email Inbound",
    heading: "Every application, sorted before you read it.",
    body: "Every job gets a unique email address. Applications flow in automatically — CV parsed, scored, and dropped into the right container.",
    bullets: ["Unique inbox per job", "Automatic CV parsing", "Scored on arrival"],
  },
  {
    id: "matching",
    label: "AI Matching",
    heading: "Real fit analysis. Not keyword matching.",
    body: "9-category scoring gives you a true fit analysis for every candidate — with a full breakdown so you know exactly who to talk to.",
    bullets: ["9-category scoring", "Full per-candidate breakdown", "Ranked shortlists"],
  },
  {
    id: "iframe",
    label: "iFrame Embed",
    heading: "Your careers page, directly connected.",
    body: "One line of code on your careers page. Candidates apply, and their data flows directly into REVETLY — no manual imports.",
    bullets: ["One-line embed", "Native apply experience", "Zero manual import"],
  },
]

export function ServicesSection() {
  const ref = useReveal()
  const [active, setActive] = useState(tabs[0].id)
  const current = tabs.find((t) => t.id === active)!

  return (
    <section id="services" ref={ref} className="rv relative overflow-hidden bg-white py-20 lg:py-28">
      <div
        className="pointer-events-none absolute -right-32 top-20 h-[400px] w-[400px] rounded-full opacity-50 blur-3xl"
        style={{ background: "radial-gradient(circle, #EBF7F9 0%, transparent 70%)" }}
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <span className="reveal rv-eyebrow inline-block rounded-full border border-[#E5E9E7] bg-[#EBF7F9] px-3 py-1 text-[#4EB0BE]">
          Our services
        </span>
        <h2 className="reveal mt-5 max-w-2xl font-sans text-3xl font-bold leading-tight tracking-tight text-[#081314] text-balance sm:text-4xl">
          Platform that matches businesses with top-tier talent.
        </h2>
        <p className="reveal mt-4 max-w-xl font-sans text-base leading-relaxed text-[#3F4A45]">
          Our tailored approach integrates seamlessly with your existing
          systems, ensuring a smooth experience from first application to
          confirmed interview.
        </p>

        {/* Tabs */}
        <div className="reveal mt-9 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`rounded-full px-5 py-2.5 font-sans text-sm font-semibold transition-all duration-200 ${
                active === tab.id
                  ? "bg-[#081314] text-white shadow-sm"
                  : "border border-[#E5E9E7] bg-white text-[#3F4A45] hover:border-[#4EB0BE] hover:text-[#4EB0BE]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div className="reveal mt-6 grid items-center gap-6 rounded-3xl border border-[#E5E9E7] bg-white p-6 shadow-sm lg:grid-cols-2 lg:p-8">
          <div key={current.id} className="rv-fade-up">
            <h3 className="font-sans text-2xl font-bold text-[#081314]">{current.heading}</h3>
            <p className="mt-4 font-sans text-sm leading-relaxed text-[#3F4A45]">{current.body}</p>
            <ul className="mt-6 space-y-3">
              {current.bullets.map((b) => (
                <li key={b} className="flex items-center gap-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#EBF7F9] text-[#4EB0BE]">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span className="font-sans text-sm font-medium text-[#081314]">{b}</span>
                </li>
              ))}
            </ul>
            <a
              href="#pricing"
              className="mt-7 inline-flex items-center gap-2 font-sans text-sm font-semibold text-[#4EB0BE] hover:text-[#2B6169]"
            >
              See plans
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>

          <div className="relative overflow-hidden rounded-2xl">
            <Image
              src="/images/hr-services-woman.png"
              alt="Recruiting professional using REVETLY"
              width={520}
              height={420}
              className="h-72 w-full rounded-2xl object-cover lg:h-80"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
