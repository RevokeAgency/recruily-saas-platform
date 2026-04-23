"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowRight, ExternalLink } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-teal-50/50 via-white to-white pt-8 pb-16 lg:pt-16 lg:pb-24">
      {/* Gray half-circle blob - right edge, large */}
      <div className="absolute right-0 top-1/4 translate-x-1/2 w-[600px] h-[600px] bg-slate-200/50 rounded-full pointer-events-none" />
      
      {/* Concentric circles - top right area */}
      <div className="absolute top-20 right-[20%] w-32 h-32 pointer-events-none">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#d1d5db" strokeWidth="1.5" opacity="0.5" />
          <circle cx="50" cy="50" r="35" fill="none" stroke="#d1d5db" strokeWidth="1.5" opacity="0.5" />
          <circle cx="50" cy="50" r="25" fill="none" stroke="#d1d5db" strokeWidth="1.5" opacity="0.5" />
          <circle cx="50" cy="50" r="15" fill="none" stroke="#d1d5db" strokeWidth="1.5" opacity="0.5" />
        </svg>
      </div>

      {/* Teal wavy SVG lines - top left */}
      <svg className="absolute top-24 left-8 w-20 h-10 pointer-events-none" viewBox="0 0 80 30">
        <path d="M0 15 Q 20 5, 40 15 T 80 15" fill="none" stroke="#5eead4" strokeWidth="2" opacity="0.6" />
        <path d="M0 22 Q 20 12, 40 22 T 80 22" fill="none" stroke="#5eead4" strokeWidth="2" opacity="0.6" />
      </svg>

      {/* Dot Pattern - bottom left, 5x5 grid */}
      <div className="absolute bottom-32 left-8 pointer-events-none">
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 25 }).map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-teal-400/60" />
          ))}
        </div>
      </div>

      {/* Additional wavy lines below dots */}
      <svg className="absolute bottom-20 left-8 w-16 h-8 pointer-events-none" viewBox="0 0 60 24">
        <path d="M0 8 Q 15 2, 30 8 T 60 8" fill="none" stroke="#5eead4" strokeWidth="2" opacity="0.5" />
        <path d="M0 16 Q 15 10, 30 16 T 60 16" fill="none" stroke="#5eead4" strokeWidth="2" opacity="0.5" />
      </svg>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-6 lg:space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 border border-teal-100">
              <span className="w-2 h-2 rounded-full bg-[#0D9488]" />
              <span className="text-sm text-[#0D9488] font-medium">AI-Powered Recruitment</span>
            </div>

            {/* Headline */}
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-slate-900 leading-[1.1] tracking-tight">
                Smarter Hiring
                <br />
                <span className="text-[#0D9488] relative inline-block">
                  Starts Here
                  <span className="absolute -bottom-2 left-0 w-[85%] h-1 bg-[#0D9488] rounded-full" />
                </span>
              </h1>
            </div>

            {/* Subtitle */}
            <p className="text-lg text-slate-600 max-w-md leading-relaxed">
              AI-powered matching to find top candidates without resume chaos.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button asChild size="lg" className="bg-[#0D9488] hover:bg-[#0B7C72] text-white rounded-lg px-6 h-12 text-base font-medium shadow-sm">
                <Link href="/auth/register">
                  Try for free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-6 h-12 text-base font-medium shadow-sm">
                <a href="https://www.youtube.com/" target="_blank" rel="noopener noreferrer">
                  How Recrewly Works
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>

            {/* Small decorative dot */}
            <div className="pt-4">
              <div className="w-2 h-2 rounded-full bg-teal-300/60" />
            </div>
          </div>

          {/* Right Column - Image with border frame */}
          <div className="relative lg:pl-8">
            {/* Image container with teal border effect */}
            <div className="relative">
              {/* Teal accent border - bottom left offset */}
              <div className="absolute -bottom-3 -left-3 w-full h-full rounded-2xl border-2 border-teal-200/60 pointer-events-none" />
              
              {/* Main image */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-xl">
                <div className="relative aspect-[4/3] w-full">
                  <Image
                    src="/images/hero-dashboard.jpg"
                    alt="AI-powered candidate matching interface showing candidate profiles with ratings"
                    fill
                    className="object-cover"
                    priority
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
