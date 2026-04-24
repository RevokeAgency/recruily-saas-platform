"use client"

import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowRight, ExternalLink } from "lucide-react"
import { WaveDivider } from "./wave-divider"

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut" }
}

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-white pt-8 pb-0 lg:pt-16">
      {/* Minimal blob - right edge */}
      <div className="absolute right-0 top-1/3 translate-x-1/3 w-[500px] h-[500px] bg-gradient-to-br from-slate-100 to-slate-200/50 rounded-full blur-sm pointer-events-none" />
      
      {/* Geometric accent - top right */}
      <svg className="absolute top-16 right-[15%] w-24 h-24 pointer-events-none opacity-20" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="none" stroke="#94a3b8" strokeWidth="0.5" />
        <circle cx="50" cy="50" r="36" fill="none" stroke="#94a3b8" strokeWidth="0.5" />
        <circle cx="50" cy="50" r="24" fill="none" stroke="#94a3b8" strokeWidth="0.5" />
        <circle cx="50" cy="50" r="12" fill="none" stroke="#94a3b8" strokeWidth="0.5" />
      </svg>

      {/* Subtle wave accent - top left */}
      <svg className="absolute top-20 left-6 w-24 h-12 pointer-events-none opacity-40" viewBox="0 0 100 40">
        <path d="M0 20 C 20 10, 40 30, 60 20 S 100 10, 100 20" fill="none" stroke="#14b8a6" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M0 28 C 20 18, 40 38, 60 28 S 100 18, 100 28" fill="none" stroke="#14b8a6" strokeWidth="1.5" strokeLinecap="round" />
      </svg>

      {/* Dot grid - bottom left */}
      <div className="absolute bottom-24 left-6 grid grid-cols-4 gap-3 pointer-events-none opacity-50">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-teal-400" />
        ))}
      </div>

      {/* Small accent line - bottom left */}
      <svg className="absolute bottom-16 left-10 w-12 h-6 pointer-events-none opacity-40" viewBox="0 0 50 20">
        <path d="M0 10 Q 12 5, 25 10 T 50 10" fill="none" stroke="#14b8a6" strokeWidth="1.5" strokeLinecap="round" />
      </svg>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Content */}
          <motion.div 
            className="space-y-6 lg:space-y-8"
            initial="initial"
            animate="animate"
            variants={{
              initial: {},
              animate: { transition: { staggerChildren: 0.1 } }
            }}
          >
            {/* Badge */}
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 border border-teal-100">
              <span className="w-2 h-2 rounded-full bg-[#0D9488]" />
              <span className="text-sm text-[#0D9488] font-medium">AI-Powered Recruitment</span>
            </motion.div>

            {/* Headline */}
            <motion.div variants={fadeInUp}>
              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-slate-900 leading-[1.1] tracking-tight">
                Smarter Hiring
                <br />
                <span className="text-[#0D9488] relative inline-block">
                  Starts Here
                  <span className="absolute -bottom-2 left-0 w-[85%] h-1 bg-[#0D9488] rounded-full" />
                </span>
              </h1>
            </motion.div>

            {/* Subtitle */}
            <motion.p variants={fadeInUp} className="text-lg text-slate-600 max-w-md leading-relaxed">
              AI-powered matching to find top candidates without resume chaos.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={fadeInUp} className="flex flex-wrap items-center gap-4 pt-2">
              <Button asChild size="lg" className="bg-[#0D9488] hover:bg-[#0B7C72] text-white rounded-lg px-6 h-12 text-base font-medium shadow-sm">
                <Link href="/auth/register">
                  Try for free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-6 h-12 text-base font-medium shadow-sm">
                <a href="https://www.youtube.com/" target="_blank" rel="noopener noreferrer">
                  How Recruitify Works
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </motion.div>

            {/* Small decorative dot */}
            <motion.div variants={fadeInUp} className="pt-4">
              <div className="w-2 h-2 rounded-full bg-teal-300/60" />
            </motion.div>
          </motion.div>

          {/* Right Column - Image */}
          <motion.div 
            className="relative lg:pl-8"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          >
            {/* Image container with subtle accent */}
            <div className="relative">
              {/* Subtle teal accent border - bottom left offset */}
              <div className="absolute -bottom-3 -left-3 w-full h-full rounded-2xl border border-teal-200/40 pointer-events-none" />
              
              {/* Main image */}
              <div className="relative rounded-2xl overflow-hidden border border-teal-100 bg-white shadow-xl">
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
          </motion.div>
        </div>
      </div>
      
      {/* Wave divider into teal-50 */}
      <div className="mt-16 lg:mt-24">
        <WaveDivider fillColor="#f0fdfa" direction="up" />
      </div>
    </section>
  )
}
