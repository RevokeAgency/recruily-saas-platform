"use client"

import { useReveal } from "@/lib/hooks/useReveal"

const integrations = ["Karriere.at", "Indeed", "LinkedIn", "Xing", "StepStone"]

export function AboutSection() {
  const { ref, visible } = useReveal<HTMLDivElement>()

  return (
    <section
      ref={ref}
      className="px-4 py-24 sm:px-6 lg:px-8"
      style={{ backgroundColor: "#111A13" }}
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-8">
          {/* Left label */}
          <div className={`reveal-left ${visible ? "visible" : ""} md:col-span-4`}>
            <p
              className="font-dm-sans text-xs font-semibold uppercase tracking-[0.1em]"
              style={{ color: "#4EB0BE" }}
            >
              About
            </p>
            <h2 className="mt-3 font-syne text-4xl font-bold text-white sm:text-5xl">
              REVETLY
            </h2>
          </div>

          {/* Right copy */}
          <div
            className={`reveal ${visible ? "visible" : ""} space-y-6 md:col-span-8`}
            style={{ transitionDelay: "0.1s" }}
          >
            <p className="font-dm-sans text-lg leading-relaxed" style={{ color: "#A8D4DB" }}>
              REVETLY was built by a team that spent years watching recruiters drown
              in CVs, inboxes, and scheduling chaos. We saw great candidates slip
              through the cracks simply because no one had time to read fast enough.
            </p>
            <p className="font-dm-sans text-lg leading-relaxed" style={{ color: "#A8D4DB" }}>
              Today REVETLY serves growing recruiting teams across Europe with a single
              AI layer that reads, scores, and schedules — so people can get back to
              the part of the job that actually matters: the conversations.
            </p>
          </div>
        </div>

        {/* Integration logos strip */}
        <div
          className={`reveal ${visible ? "visible" : ""} mt-20 border-t pt-12`}
          style={{ borderColor: "#1A3D45", transitionDelay: "0.2s" }}
        >
          <p
            className="mb-8 text-center font-dm-sans text-xs font-semibold uppercase tracking-[0.1em]"
            style={{ color: "#A8D4DB" }}
          >
            Connects with where candidates already are
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            {integrations.map((name) => (
              <span
                key={name}
                className="font-syne text-xl font-bold text-white/40 transition-colors duration-300 hover:text-white"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
