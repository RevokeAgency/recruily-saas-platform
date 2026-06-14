"use client"

import { useState } from "react"
import { Plus, Minus } from "lucide-react"
import { useReveal } from "@/lib/hooks/useReveal"

const FAQS = [
  {
    q: "How fast can I get started with REVETLY?",
    a: "Under 5 minutes. No IT department, no data migration. Post your first job and scored candidates start arriving automatically — often before your next coffee break.",
  },
  {
    q: "Is REVETLY DSGVO compliant?",
    a: "Yes. All data is processed and stored on EU servers in Frankfurt, encrypted at rest and in transit with AES-256. Full AVV documentation is included with every plan.",
  },
  {
    q: "Where do my candidates come from?",
    a: "REVETLY connects to where candidates already are — Karriere.at, Indeed, LinkedIn, Xing, StepStone — plus an embeddable apply link for your own website. No more manual imports.",
  },
  {
    q: "How does the AI scoring work?",
    a: "Every application is automatically read and scored across 9 categories. REVETLY surfaces the best matches with clear recommendations, so you spend time on conversations, not documents.",
  },
  {
    q: "Can my whole team use one pipeline?",
    a: "Absolutely. Your entire team sees the same pipeline with the same data. No double work, no lost candidates, no confusion.",
  },
  {
    q: "What if I want to cancel?",
    a: "Cancel anytime, no questions asked. There is no long-term contract and no credit card required to start your free trial.",
  },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-[#E8E8E8]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-6 text-left"
        aria-expanded={open}
      >
        <span className="font-syne text-lg font-bold text-[#081314]">{q}</span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#EBF7F9] text-[#4EB0BE]">
          {open ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </span>
      </button>
      <div
        className={`grid overflow-hidden transition-all duration-300 ease-out ${
          open ? "grid-rows-[1fr] pb-6 opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <p className="font-dm-sans overflow-hidden text-[15px] leading-relaxed text-[#4A4A4A]">
          {a}
        </p>
      </div>
    </div>
  )
}

export function FAQSection() {
  const ref = useReveal<HTMLDivElement>()
  return (
    <section id="faq" className="bg-[#F8F7F4] px-6 py-24">
      <div ref={ref} className="reveal mx-auto max-w-3xl">
        <p className="font-dm-sans text-center text-xs font-semibold uppercase tracking-[0.1em] text-[#4EB0BE]">
          FAQ
        </p>
        <h2 className="font-syne mt-3 text-center text-4xl font-bold text-[#081314] text-balance md:text-5xl">
          Questions? Answered.
        </h2>
        <div className="mt-12">
          {FAQS.map((f) => (
            <FaqItem key={f.q} {...f} />
          ))}
        </div>
      </div>
    </section>
  )
}
