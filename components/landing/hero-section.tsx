import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowRight, ExternalLink } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white py-16 lg:py-24">
      {/* Decorative Elements */}
      <div className="absolute top-20 right-20 w-32 h-32 opacity-20">
        <svg viewBox="0 0 100 100" className="w-full h-full text-slate-300">
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-96 h-96 bg-slate-200/50 rounded-full blur-3xl" />
      
      {/* Dot Pattern */}
      <div className="absolute bottom-20 left-10 grid grid-cols-4 gap-2 opacity-40">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="w-2 h-2 rounded-full bg-[#0D9488]" />
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 text-sm text-[#0D9488]">
              <span className="w-2 h-2 rounded-full bg-[#0D9488]" />
              AI-Powered Recruitment
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight">
              Smarter Hiring
              <br />
              <span className="text-[#0D9488] relative">
                Starts Here
                <span className="absolute -bottom-2 left-0 w-full h-1 bg-[#0D9488]" />
              </span>
            </h1>

            {/* Subtitle */}
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
              <Button asChild variant="outline" size="lg" className="rounded-lg px-6 border-slate-300">
                <Link href="#use-cases">
                  How Recruitify Works
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Right Image */}
          <div className="relative">
            <div className="relative rounded-2xl border-2 border-[#0D9488]/20 overflow-hidden shadow-xl bg-slate-200 aspect-[4/3]">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/home1.PNG-gydd8uaGOZiQdTjiUl3OwZ36rxYIPH.png"
                alt="AI-powered candidate matching interface"
                fill
                className="object-cover object-right"
                priority
              />
            </div>
            {/* Decorative accent */}
            <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-[#0D9488]/10 rounded-2xl -z-10" />
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-[#0D9488]/10 rounded-xl -z-10" />
          </div>
        </div>
      </div>
    </section>
  )
}
