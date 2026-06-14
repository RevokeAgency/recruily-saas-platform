"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Star, MessageSquare } from "lucide-react"

export function HeroSection() {
  return (
    <section className="rv relative overflow-hidden bg-white pt-32 pb-20 lg:pt-40 lg:pb-28">
      {/* soft abstract background blobs */}
      <div
        className="pointer-events-none absolute -right-40 -top-20 h-[480px] w-[480px] rounded-full opacity-50 blur-3xl"
        style={{ background: "radial-gradient(circle, #EAF8EF 0%, transparent 70%)" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -left-32 top-40 h-[360px] w-[360px] rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(circle, #F4F7F5 0%, transparent 70%)" }}
        aria-hidden="true"
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-6 lg:grid-cols-2 lg:px-8">
        {/* Left copy */}
        <div>
          <span className="rv-fade-up inline-flex items-center gap-2 rounded-full border border-[#E5E9E7] bg-[#F4F7F5] px-4 py-1.5 font-sans text-xs font-medium text-[#3F4A45]">
            <span className="h-2 w-2 rounded-full bg-[#1DB954]" />
            250+ recruiting teams trust REVETLY
          </span>

          <h1 className="rv-fade-up rv-delay-1 mt-6 font-sans text-4xl font-bold leading-[1.08] tracking-tight text-[#0F3D2C] text-balance sm:text-5xl lg:text-6xl">
            Recruitment process with{" "}
            <span className="text-[#1DB954]">smart AI solutions.</span>
          </h1>

          <p className="rv-fade-up rv-delay-2 mt-6 max-w-md font-sans text-base leading-relaxed text-[#3F4A45]">
            REVETLY automates everything before the interview — so your team
            focuses on the conversation that matters.
          </p>

          <div className="rv-fade-up rv-delay-3 mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 rounded-full bg-[#1DB954] px-6 py-3.5 font-sans text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#158A3E] hover:shadow-md"
            >
              Start Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-full border border-[#E5E9E7] bg-white px-6 py-3.5 font-sans text-sm font-semibold text-[#0F3D2C] transition-all duration-200 hover:border-[#1DB954] hover:text-[#1DB954]"
            >
              See How it Works
              <MessageSquare className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Right visual: dark stat panel + floating photo card */}
        <div className="rv-fade-up rv-delay-2 relative mx-auto w-full max-w-md">
          <div className="relative rounded-3xl bg-[#0F3D2C] p-7 pr-32 text-white shadow-xl">
            <p className="font-sans text-2xl font-bold leading-tight">
              Successfully connected over 1,000 businesses with top talent.
            </p>
            <p className="mt-4 max-w-[14rem] font-sans text-xs leading-relaxed text-[#B8CCC2]">
              Reducing time-to-interview by 73% and removing manual screening
              across teams.
            </p>
          </div>

          {/* Floating recruiter photo card */}
          <div className="rv-float absolute -right-1 -top-10 w-44 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 sm:w-48">
            <div className="relative">
              <Image
                src="/images/hr-hero-recruiter.png"
                alt="REVETLY talent specialist"
                width={220}
                height={260}
                className="h-56 w-full object-cover"
              />
              <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 font-sans text-[10px] font-semibold text-[#0F3D2C] shadow-sm">
                <Star className="h-3 w-3 fill-[#1DB954] text-[#1DB954]" />
                Top rated platform
              </span>
            </div>
            <div className="p-3">
              <p className="font-sans text-sm font-bold text-[#0F3D2C]">Sarah Mitchell</p>
              <p className="font-sans text-[11px] text-[#6B7280]">Talent Acquisition Lead</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
