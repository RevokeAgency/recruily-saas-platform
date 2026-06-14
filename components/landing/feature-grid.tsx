"use client"

import { useReveal } from "@/lib/hooks/useReveal"
import { ScanLine, Search, Mail, KanbanSquare } from "lucide-react"

const features = [
  {
    icon: ScanLine,
    title: "AI CV Screening",
    body: "Automatically reads and scores every application across 9 categories. No manual reading required.",
    mock: "score",
  },
  {
    icon: Search,
    title: "Smart Candidate Search",
    body: "Ask REVETLY to find candidates matching any criteria. Get results in seconds.",
    mock: "search",
  },
  {
    icon: Mail,
    title: "Email Automation",
    body: "From job posting to interview confirmation — every email sent automatically.",
    mock: "email",
  },
  {
    icon: KanbanSquare,
    title: "Team Pipeline",
    body: "Your whole team sees the same pipeline. No double work, no lost candidates, no confusion.",
    mock: "kanban",
  },
]

function MiniMock({ type }: { type: string }) {
  if (type === "score") {
    return (
      <div className="space-y-2">
        {[
          { label: "Skills Match", val: 94 },
          { label: "Experience", val: 88 },
          { label: "Language B2", val: 76 },
        ].map((r) => (
          <div key={r.label}>
            <div className="flex justify-between font-dm-sans text-[11px] text-slate-500">
              <span>{r.label}</span>
              <span className="font-semibold text-slate-700">{r.val}%</span>
            </div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100">
              <div className="h-full rounded-full" style={{ width: `${r.val}%`, backgroundColor: "#4EB0BE" }} />
            </div>
          </div>
        ))}
      </div>
    )
  }
  if (type === "search") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
          <Search className="h-3.5 w-3.5 text-slate-400" />
          <span className="font-dm-sans text-[11px] text-slate-500">Senior Dev, Vienna, B2 German…</span>
        </div>
        {["Anna K. — 92%", "Mehmet Y. — 89%", "Lisa R. — 84%"].map((c) => (
          <div key={c} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
            <span className="font-dm-sans text-[11px] text-slate-700">{c.split(" — ")[0]}</span>
            <span className="font-dm-sans text-[11px] font-semibold" style={{ color: "#4EB0BE" }}>
              {c.split(" — ")[1]}
            </span>
          </div>
        ))}
      </div>
    )
  }
  if (type === "email") {
    return (
      <div className="space-y-2">
        {["Application received ✓", "Screening invite sent ✓", "Interview confirmed ✓"].map((c, i) => (
          <div key={c} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ backgroundColor: i === 2 ? "#4EB0BE" : "#A8D4DB" }}
            >
              {i + 1}
            </span>
            <span className="font-dm-sans text-[11px] text-slate-700">{c}</span>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-3 gap-2">
      {["New", "Screening", "Interview"].map((col) => (
        <div key={col} className="rounded-lg bg-slate-50 p-2">
          <p className="mb-2 font-dm-sans text-[10px] font-semibold uppercase text-slate-400">{col}</p>
          <div className="space-y-1.5">
            <div className="h-6 rounded bg-white shadow-sm" />
            <div className="h-6 rounded bg-white shadow-sm" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function FeatureGrid() {
  const { ref, visible } = useReveal<HTMLDivElement>()

  return (
    <section
      id="features"
      ref={ref}
      className="px-4 py-24 sm:px-6 lg:px-8"
      style={{ backgroundColor: "#F8F7F4" }}
    >
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className={`reveal ${visible ? "visible" : ""} font-syne text-4xl font-bold sm:text-[42px]`} style={{ color: "#0A0A0A" }}>
            What REVETLY Does For You &amp; Your Team
          </h2>
          <p
            className={`reveal ${visible ? "visible" : ""} mt-3 font-syne text-xl font-bold`}
            style={{ color: "#4EB0BE", transitionDelay: "0.05s" }}
          >
            Powered by AI.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2">
          {features.map((f, i) => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                className={`reveal ${visible ? "visible" : ""} group rounded-2xl border bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}
                style={{ borderColor: "#E8E8E8", transitionDelay: `${0.1 + i * 0.1}s` }}
              >
                <div
                  className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ backgroundColor: "#EBF7F9" }}
                >
                  <Icon className="h-5 w-5" style={{ color: "#4EB0BE" }} />
                </div>
                <h3 className="font-syne text-2xl font-bold" style={{ color: "#0A0A0A" }}>
                  {f.title}
                </h3>
                <p className="mt-3 font-dm-sans text-base leading-relaxed" style={{ color: "#4A4A4A" }}>
                  {f.body}
                </p>
                <div className="mt-6 rounded-xl border p-4" style={{ borderColor: "#E8E8E8" }}>
                  <MiniMock type={f.mock} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
