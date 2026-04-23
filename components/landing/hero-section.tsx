import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowRight, ExternalLink } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-teal-50 via-white to-white py-16 lg:py-24">
      {/* Gray half-circle blob - right edge */}
      <div className="absolute right-0 top-1/3 translate-x-1/2 w-[500px] h-[500px] bg-slate-200/70 rounded-full" />
      
      {/* Teal wavy SVG lines - bottom left */}
      <svg className="absolute bottom-32 left-6 w-24 h-12 text-teal-300 opacity-60" viewBox="0 0 100 40">
        <path d="M0 20 Q 25 5, 50 20 T 100 20" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M0 30 Q 25 15, 50 30 T 100 30" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>

      {/* Dot Pattern - bottom left, 4x4 grid */}
      <div className="absolute bottom-48 left-8 grid grid-cols-4 gap-3">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="w-2 h-2 rounded-full bg-teal-300" />
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            {/* Badge - full pill with teal-50 background */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 text-sm text-[#0D9488] font-medium">
              <span className="w-2 h-2 rounded-full bg-[#0D9488]" />
              AI-Powered Recruitment
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight">
              Smarter Hiring
              <br />
              <span className="text-[#0D9488] relative inline-block">
                Starts Here
                {/* Short 80px teal underline */}
                <span className="absolute -bottom-2 left-0 w-20 h-1 bg-[#0D9488]" />
              </span>
            </h1>

            {/* Subtitle - text-lg */}
            <p className="text-lg text-slate-600 max-w-md">
              AI-powered matching to find top candidates without resume chaos.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg" className="bg-[#0D9488] hover:bg-[#0B7C72] text-white rounded-lg px-6">
                <Link href="/auth/register">
                  Try for free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              {/* Dark button - bg-slate-900 text-white */}
              <Button asChild size="lg" className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-6">
                <Link href="#use-cases">
                  How Recruitify Works
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Right Column with Image and Decorative Elements */}
          <div className="relative">
            {/* Concentric circles - OUTSIDE image, top-right of column */}
            <div className="absolute -top-8 -right-4 w-28 h-28 z-10">
              <svg viewBox="0 0 100 100" className="w-full h-full text-slate-300/50">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" />
                <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="2" />
                <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="2" />
                <circle cx="50" cy="50" r="15" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>

            {/* Image - NO white card wrapper, just border */}
            <div className="relative rounded-2xl border border-teal-100 overflow-hidden shadow-lg bg-slate-200 aspect-[4/3]">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/home1.PNG-gydd8uaGOZiQdTjiUl3OwZ36rxYIPH.png"
                alt="AI-powered candidate matching interface"
                fill
                className="object-cover object-right"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
