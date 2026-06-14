"use client"

import Image from "next/image"
import { useReveal } from "@/lib/hooks/useReveal"

const personas = [
  {
    title: "Personalleasing Firms",
    subtitle: "Managing 20+ open roles simultaneously",
    image: "/images/persona-leasing.png",
    quote:
      "We used to have 3 people just processing applications. Now REVETLY handles that before we arrive at the office.",
  },
  {
    title: "Headhunters & Recruiters",
    subtitle: "Finding the perfect match, fast",
    image: "/images/persona-headhunter.png",
    quote:
      "I stopped reading CVs. REVETLY tells me who to call. I just make the calls.",
  },
  {
    title: "HR Teams / Mittelstand",
    subtitle: "No big HR budget, big results",
    image: "/images/persona-hr-team.png",
    quote:
      "Setup took 4 minutes. First scored candidates were waiting by morning.",
  },
]

export function PersonaSection() {
  const { ref, visible } = useReveal<HTMLDivElement>()

  return (
    <section
      ref={ref}
      className="px-4 py-24 sm:px-6 lg:px-8"
      style={{ backgroundColor: "#081314" }}
    >
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className={`reveal ${visible ? "visible" : ""} font-syne text-4xl font-bold text-white sm:text-5xl`}>
            3 Recruiting Profiles That REVETLY Was Built For.
          </h2>
          <p
            className={`reveal ${visible ? "visible" : ""} mt-5 font-dm-sans text-lg`}
            style={{ color: "#7AABB2", transitionDelay: "0.1s" }}
          >
            One platform that adapts to how your team already works — whether you
            run an agency, hunt solo, or build a department.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          {personas.map((p, i) => (
            <div
              key={p.title}
              className={`reveal ${visible ? "visible" : ""} group flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-1`}
              style={{
                backgroundColor: "#0F1F21",
                borderColor: "#1A3438",
                transitionDelay: `${0.15 + i * 0.15}s`,
              }}
            >
              <div className="relative h-48 overflow-hidden">
                <Image
                  src={p.image || "/placeholder.svg"}
                  alt={p.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="flex flex-1 flex-col p-7">
                <h3 className="font-syne text-xl font-bold text-white">{p.title}</h3>
                <p className="mt-1 font-dm-sans text-sm" style={{ color: "#4EB0BE" }}>
                  {p.subtitle}
                </p>
                <blockquote
                  className="mt-5 border-l-2 pl-4 font-dm-sans text-base italic leading-relaxed"
                  style={{ borderColor: "#4EB0BE", color: "#7AABB2" }}
                >
                  {`"${p.quote}"`}
                </blockquote>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
