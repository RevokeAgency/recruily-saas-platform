"use client"

import { useState } from "react"
import Link from "next/link"
import { Check } from "lucide-react"
import { useReveal } from "@/lib/hooks/useReveal"

export function PricingSection() {
  const [annual, setAnnual] = useState(false)
  const { ref, visible } = useReveal<HTMLDivElement>()

  const proPrice = annual ? 199 : 249
  const starterPrice = annual ? 79 : 99
  const agencyPrice = annual ? 399 : 499

  return (
    <section
      id="pricing"
      ref={ref}
      className="px-4 py-24 sm:px-6 lg:px-8"
      style={{ backgroundColor: "#F8F7F4" }}
    >
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <h2 className={`reveal ${visible ? "visible" : ""} font-syne text-4xl font-bold sm:text-5xl`} style={{ color: "#0A0A0A" }}>
            Simple pricing. No surprises.
          </h2>
          <p className={`reveal ${visible ? "visible" : ""} mt-4 font-dm-sans text-lg`} style={{ color: "#4A4A4A", transitionDelay: "0.05s" }}>
            Start free. Scale when you&apos;re ready. Cancel anytime.
          </p>

          {/* Toggle */}
          <div className={`reveal ${visible ? "visible" : ""} mt-8 inline-flex items-center gap-3 rounded-full border bg-white p-1.5`} style={{ borderColor: "#E8E8E8", transitionDelay: "0.1s" }}>
            <button
              onClick={() => setAnnual(false)}
              className="rounded-full px-5 py-2 font-dm-sans text-sm font-medium transition-colors"
              style={{ backgroundColor: !annual ? "#1DB954" : "transparent", color: !annual ? "#FFFFFF" : "#4A4A4A" }}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className="flex items-center gap-2 rounded-full px-5 py-2 font-dm-sans text-sm font-medium transition-colors"
              style={{ backgroundColor: annual ? "#1DB954" : "transparent", color: annual ? "#FFFFFF" : "#4A4A4A" }}
            >
              Annual
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ backgroundColor: annual ? "rgba(255,255,255,0.25)" : "#F0FAF4", color: annual ? "#FFFFFF" : "#158A3E" }}
              >
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Cards: featured left, two stacked right */}
        <div className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Professional — featured */}
          <div
            className={`reveal-left ${visible ? "visible" : ""} flex flex-col rounded-2xl bg-white p-9 shadow-lg lg:col-span-6`}
            style={{ borderTop: "3px solid #1DB954", transitionDelay: "0.15s" }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-syne text-2xl font-bold" style={{ color: "#0A0A0A" }}>
                Professional
              </h3>
              <span className="rounded-full px-3 py-1 font-dm-sans text-xs font-semibold" style={{ backgroundColor: "#F0FAF4", color: "#158A3E" }}>
                Most Popular
              </span>
            </div>
            <p className="mt-2 font-dm-sans text-sm" style={{ color: "#4A4A4A" }}>
              For growing recruiting teams who need the full REVETLY experience.
            </p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="font-syne text-5xl font-bold" style={{ color: "#0A0A0A" }}>
                €{proPrice}
              </span>
              <span className="font-dm-sans text-base" style={{ color: "#4A4A4A" }}>
                /mo
              </span>
            </div>
            <ul className="mt-8 grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                "Up to 10 active job containers",
                "Email inbound automation",
                "AI CV matching + scoring",
                "Voice screening",
                "Auto-scheduling & reminders",
                "Shareable apply link",
                "Priority support",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: "#1DB954" }} />
                  <span className="font-dm-sans text-sm" style={{ color: "#4A4A4A" }}>
                    {f}
                  </span>
                </li>
              ))}
            </ul>
            <Link
              href="/auth/register"
              className="mt-8 rounded-[8px] px-6 py-3.5 text-center font-dm-sans text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: "#1DB954" }}
            >
              Start Free Trial
            </Link>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-6 lg:col-span-6">
            {/* Starter */}
            <div
              className={`reveal-right ${visible ? "visible" : ""} flex flex-1 flex-col rounded-2xl border bg-white p-8`}
              style={{ borderColor: "#E8E8E8", transitionDelay: "0.2s" }}
            >
              <div className="flex items-baseline justify-between">
                <h3 className="font-syne text-xl font-bold" style={{ color: "#0A0A0A" }}>
                  Starter
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="font-syne text-3xl font-bold" style={{ color: "#0A0A0A" }}>
                    €{starterPrice}
                  </span>
                  <span className="font-dm-sans text-sm" style={{ color: "#4A4A4A" }}>
                    /mo
                  </span>
                </div>
              </div>
              <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
                {["Up to 3 active jobs", "Email inbound", "AI matching", "Apply link"].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="h-4 w-4 flex-shrink-0" style={{ color: "#1DB954" }} />
                    <span className="font-dm-sans text-sm" style={{ color: "#4A4A4A" }}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/register"
                className="mt-6 rounded-[8px] border px-6 py-3 text-center font-dm-sans text-sm font-semibold transition-colors"
                style={{ borderColor: "#1DB954", color: "#158A3E" }}
              >
                Start Free
              </Link>
            </div>

            {/* Agency */}
            <div
              className={`reveal-right ${visible ? "visible" : ""} flex flex-1 flex-col rounded-2xl border bg-white p-8`}
              style={{ borderColor: "#E8E8E8", transitionDelay: "0.28s" }}
            >
              <div className="flex items-baseline justify-between">
                <h3 className="font-syne text-xl font-bold" style={{ color: "#0A0A0A" }}>
                  Agency
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="font-syne text-3xl font-bold" style={{ color: "#0A0A0A" }}>
                    €{agencyPrice}
                  </span>
                  <span className="font-dm-sans text-sm" style={{ color: "#4A4A4A" }}>
                    /mo
                  </span>
                </div>
              </div>
              <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
                {["Unlimited jobs", "iFrame embed", "White label", "Account manager"].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="h-4 w-4 flex-shrink-0" style={{ color: "#1DB954" }} />
                    <span className="font-dm-sans text-sm" style={{ color: "#4A4A4A" }}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                href="/contact"
                className="mt-6 rounded-[8px] border px-6 py-3 text-center font-dm-sans text-sm font-semibold transition-colors"
                style={{ borderColor: "#1DB954", color: "#158A3E" }}
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
