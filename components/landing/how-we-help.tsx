"use client"

import { Workflow, Target, Clock } from "lucide-react"
import { useReveal } from "@/lib/hooks/useReveal"
import { ScoreRing } from "@/components/landing/score-ring"

const cards = [
  {
    icon: Workflow,
    title: "Automate Your Pipeline",
    body: "From application to interview — fully automated. Zero manual steps.",
    score: 100,
    metric: "automated",
  },
  {
    icon: Target,
    title: "Find the Right Candidates",
    body: "AI scoring across 9 categories tells you exactly who to talk to.",
    score: 94,
    metric: "match accuracy",
  },
  {
    icon: Clock,
    title: "Save Hours Every Week",
    body: "73% less time on CV screening. 6x faster time-to-interview.",
    score: 73,
    metric: "less admin time",
  },
]

export function HowWeHelp() {
  const ref = useReveal()

  return (
    <section ref={ref} className="rv bg-[#EBF7F9] py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="reveal rv-eyebrow inline-block rounded-full border border-[#E5E9E7] bg-white px-3 py-1 text-[#4EB0BE]">
            How we help
          </span>
          <h2 className="reveal mt-5 font-sans text-3xl font-bold leading-tight tracking-tight text-[#081314] text-balance sm:text-4xl">
            We help your team hire better by removing everything in the way.
          </h2>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {cards.map((c, i) => (
            <div
              key={c.title}
              className="reveal flex flex-col rounded-2xl border border-[#E5E9E7] bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              data-delay={i * 110}
            >
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EBF7F9] text-[#4EB0BE]">
                  <c.icon className="h-5 w-5" />
                </span>
                <ScoreRing value={c.score} size={58} stroke={5} />
              </div>
              <h3 className="mt-6 font-sans text-lg font-bold text-[#081314]">{c.title}</h3>
              <p className="mt-2 font-sans text-sm leading-relaxed text-[#6B7280]">{c.body}</p>
              <span className="mt-4 font-sans text-xs font-medium uppercase tracking-[0.08em] text-[#4EB0BE]">
                {c.metric}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
