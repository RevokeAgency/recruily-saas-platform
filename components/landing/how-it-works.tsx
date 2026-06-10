"use client"

import { useReveal } from "@/lib/hooks/useReveal"

const steps = [
  { num: "01", title: "Post your job", body: "Add your requirements and publish your apply link in under a minute." },
  { num: "02", title: "AI reads every CV", body: "Each application is scored across 9 categories the moment it arrives." },
  { num: "03", title: "Review ranked matches", body: "Open REVETLY to a pipeline that's already read, scored, and ranked." },
  { num: "04", title: "Invite & schedule", body: "Send interview invites and confirmations — emails go out automatically." },
]

export function HowItWorks() {
  const { ref, visible } = useReveal<HTMLDivElement>()

  return (
    <section
      id="how-it-works"
      ref={ref}
      className="px-4 py-24 sm:px-6 lg:px-8"
      style={{ backgroundColor: "#111A13" }}
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-10">
          <div className={`reveal-left ${visible ? "visible" : ""} md:col-span-5`}>
            <p className="font-dm-sans text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: "#1DB954" }}>
              Recruiting Flow
            </p>
            <h2 className="mt-4 font-syne text-4xl font-bold leading-tight text-white sm:text-5xl">
              Ever spent a whole morning on CV screening instead of actually recruiting?
            </h2>
            <p className="mt-6 font-dm-sans text-lg leading-relaxed" style={{ color: "#A8C4B0" }}>
              Now you just open REVETLY. Every application is already read, scored, and
              ranked. Your team sees the same data, works the same pipeline, and never
              loses a great candidate again.
            </p>
          </div>

          <div className="md:col-span-7">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {steps.map((s, i) => (
                <div
                  key={s.num}
                  className={`reveal ${visible ? "visible" : ""} rounded-2xl border p-7`}
                  style={{
                    backgroundColor: "#1A2E1E",
                    borderColor: "#2D4A35",
                    transitionDelay: `${0.1 + i * 0.1}s`,
                  }}
                >
                  <span className="font-syne text-3xl font-bold" style={{ color: "#1DB954" }}>
                    {s.num}
                  </span>
                  <h3 className="mt-4 font-syne text-lg font-bold text-white">{s.title}</h3>
                  <p className="mt-2 font-dm-sans text-sm leading-relaxed" style={{ color: "#A8C4B0" }}>
                    {s.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
