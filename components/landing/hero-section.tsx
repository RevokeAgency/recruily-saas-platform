"use client"

import Link from "next/link"
import { Check, ArrowRight, Star } from "lucide-react"

function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const r = (size - 8) / 2
  const c = 2 * Math.PI * r
  const offset = c - (score / 100) * c
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2D4A35" strokeWidth="4" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#1DB954"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        className="rotate-90 font-syne text-[13px] font-bold"
        fill="#1DB954"
        style={{ transformOrigin: "center" }}
      >
        {score}
      </text>
    </svg>
  )
}

const heroWords = ["The", "Recruiting", "Platform", "That", "Works", "While", "You", "Sleep."]

export function HeroSection() {
  return (
    <section
      className="relative overflow-hidden px-4 pb-28 pt-14 sm:px-6 lg:px-8"
      style={{ backgroundColor: "#0D1F14" }}
    >
      {/* soft radial glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(29,185,84,0.25), transparent 65%)" }}
      />

      <div className="relative mx-auto max-w-5xl text-center">
        {/* Announcement pill */}
        <div
          className="rv-scale-in rv-delay-1 mb-8 inline-flex items-center gap-2 rounded-full border px-4 py-1.5"
          style={{ borderColor: "#2D4A35", backgroundColor: "#1A2E1E" }}
        >
          <span className="font-dm-sans text-sm" style={{ color: "#A8C4B0" }}>
            🚀 Now in Public Beta
          </span>
        </div>

        {/* Headline */}
        <h1 className="font-fraunces text-5xl font-semibold leading-[1.05] text-white text-balance sm:text-6xl lg:text-7xl">
          {heroWords.map((w, i) => (
            <span
              key={i}
              className="rv-fade-up inline-block"
              style={{ animationDelay: `${0.15 + i * 0.06}s` }}
            >
              {w}&nbsp;
            </span>
          ))}
        </h1>
        <p
          className="rv-fade-up rv-delay-6 mt-2 font-syne text-3xl font-bold sm:text-4xl lg:text-5xl"
          style={{ color: "#1DB954" }}
        >
          Powered by AI.
        </p>

        <p
          className="rv-fade-up rv-delay-6 mx-auto mt-7 max-w-2xl font-dm-sans text-base leading-relaxed sm:text-lg"
          style={{ color: "#A8C4B0" }}
        >
          REVETLY automates your entire pipeline — from the first application to the confirmed
          interview. So your team can focus on building relationships, not managing inboxes.
        </p>

        {/* CTAs */}
        <div className="rv-fade-up rv-delay-7 mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/auth/register"
            className="inline-flex items-center justify-center gap-2 rounded-[6px] px-7 py-3.5 font-dm-sans text-base font-semibold text-white transition-all duration-200 hover:scale-[1.03]"
            style={{ backgroundColor: "#1DB954" }}
          >
            Get Started Free
          </Link>
          <Link
            href="#how-it-works"
            className="inline-flex items-center justify-center gap-2 rounded-[6px] border px-7 py-3.5 font-dm-sans text-base font-medium text-white transition-all duration-200 hover:bg-white/5"
            style={{ borderColor: "#2D4A35" }}
          >
            See a Demo <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Floating product UI */}
      <div className="relative mx-auto mt-16 max-w-6xl">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:items-start">
          {/* Left: job container card */}
          <div
            className="rv-fade-up rv-delay-6 rv-float rounded-2xl border p-5 text-left lg:mt-8"
            style={{
              backgroundColor: "#1A2E1E",
              borderColor: "rgba(29,185,84,0.2)",
              boxShadow: "0 0 40px rgba(29,185,84,0.08)",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="font-syne text-sm font-bold text-white">Senior Developer</span>
              <span
                className="rounded-full px-2 py-0.5 font-dm-sans text-[11px] font-medium"
                style={{ backgroundColor: "rgba(29,185,84,0.15)", color: "#1DB954" }}
              >
                Active
              </span>
            </div>
            <p className="mt-1 font-dm-sans text-xs" style={{ color: "#A8C4B0" }}>
              Vienna · Full-time · 24 applicants
            </p>
            <div className="mt-4 space-y-2.5">
              {[
                { n: "Lena Hofer", s: 94 },
                { n: "Marco Bauer", s: 88 },
                { n: "Sara Klein", s: 81 },
              ].map((c) => (
                <div
                  key={c.n}
                  className="flex items-center justify-between rounded-lg px-3 py-2"
                  style={{ backgroundColor: "#0D1F14" }}
                >
                  <span className="font-dm-sans text-xs text-white">{c.n}</span>
                  <span className="font-syne text-xs font-bold" style={{ color: "#1DB954" }}>
                    {c.s}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Center: score ring */}
          <div
            className="rv-scale-in rv-delay-7 rv-float-slow flex flex-col items-center justify-center rounded-2xl border p-7"
            style={{
              backgroundColor: "#1A2E1E",
              borderColor: "rgba(29,185,84,0.2)",
              boxShadow: "0 0 40px rgba(29,185,84,0.1)",
            }}
          >
            <ScoreRing score={94} size={108} />
            <p className="mt-4 font-syne text-base font-bold text-white">AI Match 94%</p>
            <p className="mt-1 font-dm-sans text-xs" style={{ color: "#A8C4B0" }}>
              Scored across 9 categories
            </p>
            <div
              className="mt-4 flex items-center gap-1.5 rounded-full px-3 py-1.5"
              style={{ backgroundColor: "rgba(29,185,84,0.15)" }}
            >
              <Check className="h-3.5 w-3.5" style={{ color: "#1DB954" }} />
              <span className="font-dm-sans text-xs font-medium" style={{ color: "#1DB954" }}>
                Interview Confirmed
              </span>
            </div>
          </div>

          {/* Right: candidate + status */}
          <div className="space-y-5 lg:mt-4">
            <div
              className="rv-fade-up rv-delay-7 rv-float rounded-2xl border p-5 text-left"
              style={{
                backgroundColor: "#1A2E1E",
                borderColor: "rgba(29,185,84,0.2)",
                boxShadow: "0 0 40px rgba(29,185,84,0.08)",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-full font-syne text-sm font-bold text-white"
                  style={{ backgroundColor: "#158A3E" }}
                >
                  LH
                </div>
                <div className="flex-1">
                  <p className="font-syne text-sm font-bold text-white">Lena Hofer</p>
                  <p className="font-dm-sans text-xs" style={{ color: "#A8C4B0" }}>
                    Senior Developer
                  </p>
                </div>
                <ScoreRing score={89} size={48} />
              </div>
              <div className="mt-3 flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-current" style={{ color: "#1DB954" }} />
                ))}
              </div>
            </div>

            <div
              className="rv-scale-in rounded-2xl border p-4 text-left"
              style={{
                animationDelay: "1.1s",
                backgroundColor: "#1A2E1E",
                borderColor: "rgba(29,185,84,0.2)",
              }}
            >
              <p className="font-dm-sans text-xs" style={{ color: "#A8C4B0" }}>
                Email automation
              </p>
              <p className="mt-1 font-syne text-sm font-bold text-white">
                3 invites sent automatically
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
