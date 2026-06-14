"use client"

import Image from "next/image"
import { useReveal } from "@/lib/hooks/useReveal"
import { useCountUp } from "@/lib/hooks/useCountUp"

export function StatsBand() {
  const { ref, visible } = useReveal<HTMLDivElement>()
  const candidates = useCountUp(245, visible, 1500)
  const adminTime = useCountUp(73, visible, 1500)

  return (
    <section
      ref={ref}
      className="px-4 py-16 sm:px-6 lg:px-8"
      style={{ backgroundColor: "#081314" }}
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:grid-rows-2 md:gap-5">
          {/* Stat 1 — candidates processed */}
          <div
            className={`reveal ${visible ? "visible" : ""} flex flex-col justify-between rounded-2xl border p-7 md:col-span-3 md:row-span-1`}
            style={{ backgroundColor: "#0F1F21", borderColor: "#1A3438" }}
          >
            <p className="font-syne text-5xl font-bold text-white">
              {candidates}k
            </p>
            <p className="mt-3 font-dm-sans text-sm" style={{ color: "#7AABB2" }}>
              Candidates Processed
            </p>
          </div>

          {/* Big team photo */}
          <div
            className={`reveal ${visible ? "visible" : ""} relative min-h-[220px] overflow-hidden rounded-2xl md:col-span-6 md:row-span-2`}
            style={{ transitionDelay: "0.1s" }}
          >
            <Image
              src="/images/collage-team.png"
              alt="Recruiting team collaborating"
              fill
              className="object-cover"
            />
            <div
              className="absolute bottom-5 left-5 rounded-full px-4 py-1.5 font-dm-sans text-sm font-semibold text-white"
              style={{ backgroundColor: "rgba(8,19,20,0.7)", backdropFilter: "blur(6px)" }}
            >
              #1 Recruiting Tool DACH
            </div>
          </div>

          {/* Stat 2 — less admin time */}
          <div
            className={`reveal ${visible ? "visible" : ""} flex flex-col justify-between rounded-2xl border p-7 md:col-span-3 md:row-span-1`}
            style={{ backgroundColor: "#4EB0BE", borderColor: "#4EB0BE", transitionDelay: "0.15s" }}
          >
            <p className="font-syne text-5xl font-bold text-white">{adminTime}%</p>
            <p className="mt-3 font-dm-sans text-sm text-white/90">Less Admin Time</p>
          </div>

          {/* Writing photo */}
          <div
            className={`reveal ${visible ? "visible" : ""} relative min-h-[160px] overflow-hidden rounded-2xl md:col-span-3 md:row-span-1`}
            style={{ transitionDelay: "0.2s" }}
          >
            <Image
              src="/images/collage-writing.png"
              alt="Recruiter taking notes"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
