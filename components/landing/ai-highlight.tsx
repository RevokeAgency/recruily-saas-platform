"use client"

import { useReveal } from "@/lib/hooks/useReveal"
import { Search, ArrowRight } from "lucide-react"

export function AiHighlight() {
  const { ref, visible } = useReveal<HTMLDivElement>()

  return (
    <section
      ref={ref}
      className="px-4 py-24 sm:px-6 lg:px-8"
      style={{ backgroundColor: "#F8F7F4" }}
    >
      <div className="mx-auto max-w-3xl text-center">
        <p
          className={`reveal ${visible ? "visible" : ""} font-dm-sans text-xs font-semibold uppercase tracking-[0.1em]`}
          style={{ color: "#1DB954" }}
        >
          REVETLY AI
        </p>
        <h2
          className={`reveal ${visible ? "visible" : ""} mt-4 font-syne text-4xl font-bold sm:text-5xl`}
          style={{ color: "#0A0A0A", transitionDelay: "0.05s" }}
        >
          Simply post a job and get your best candidates. Automatically.
        </h2>
        <p
          className={`reveal ${visible ? "visible" : ""} mx-auto mt-5 max-w-[600px] font-dm-sans text-lg leading-relaxed`}
          style={{ color: "#4A4A4A", transitionDelay: "0.1s" }}
        >
          With REVETLY, you post a job and receive a ranked list of candidates —
          scored across 9 categories, with AI recommendations ready. No manual work.
          No guessing.
        </p>
      </div>

      {/* Search mockup */}
      <div
        className={`reveal ${visible ? "visible" : ""} mx-auto mt-12 max-w-2xl`}
        style={{ transitionDelay: "0.15s" }}
      >
        <div className="flex items-center gap-3 rounded-2xl border bg-white p-3 shadow-sm" style={{ borderColor: "#E8E8E8" }}>
          <Search className="ml-2 h-5 w-5 flex-shrink-0 text-slate-400" />
          <span className="flex-1 truncate font-dm-sans text-sm text-slate-500 sm:text-base">
            Find me candidates for Senior Developer, Vienna, B2 German…
          </span>
          <button
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 font-dm-sans text-sm font-semibold text-white transition-transform hover:scale-[1.03]"
            style={{ backgroundColor: "#1DB954" }}
          >
            Search
          </button>
        </div>

        {/* Example result card */}
        <div className="mt-4 flex items-center gap-4 rounded-2xl border bg-white p-5 shadow-sm" style={{ borderColor: "#E8E8E8" }}>
          <div
            className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full font-syne text-lg font-bold text-white"
            style={{ backgroundColor: "#1DB954" }}
          >
            94
          </div>
          <div className="flex-1 text-left">
            <p className="font-syne text-base font-bold" style={{ color: "#0A0A0A" }}>
              Anna Kovač
            </p>
            <p className="font-dm-sans text-sm" style={{ color: "#4A4A4A" }}>
              Senior Developer · Vienna · 7 yrs experience
            </p>
          </div>
          <span
            className="rounded-full px-3 py-1 font-dm-sans text-xs font-semibold"
            style={{ backgroundColor: "#F0FAF4", color: "#158A3E" }}
          >
            Top Match
          </span>
        </div>

        <div className="mt-8 flex justify-center">
          <button
            className="group flex items-center gap-2 font-dm-sans text-base font-semibold transition-colors"
            style={{ color: "#158A3E" }}
          >
            Try It Free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </section>
  )
}
