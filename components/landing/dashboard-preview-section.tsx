"use client"

import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { WaveDivider } from "./wave-divider"

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.5, ease: "easeOut" }
}

export function DashboardPreviewSection() {
  return (
    <section className="pt-20 pb-0 relative overflow-hidden" style={{ background: "linear-gradient(180deg, #0D9488 0%, #0B7C72 100%)" }}>
      {/* Subtle geometric accents */}
      <div className="absolute top-16 right-12 opacity-20 pointer-events-none">
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="white" strokeWidth="0.5" />
          <circle cx="50" cy="50" r="30" fill="none" stroke="white" strokeWidth="0.5" />
          <circle cx="50" cy="50" r="20" fill="none" stroke="white" strokeWidth="0.5" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div 
          className="text-center mb-12"
          {...fadeInUp}
        >
          <p className="text-sm font-medium text-white/80 mb-2">IMLRS Technology</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Your Dashboard at a Glance
          </h2>
          <p className="text-lg text-white/80">
            See all jobs, candidates, and matching scores in one clean view.
          </p>
        </motion.div>

        {/* Dashboard Preview */}
        <motion.div 
          className="relative"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Browser frame */}
          <div className="bg-white rounded-2xl shadow-2xl border border-teal-200 overflow-hidden">
            {/* Browser header */}
            <div className="bg-slate-100 px-4 py-3 flex items-center gap-3 border-b border-slate-200">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-white rounded-lg px-4 py-1.5 text-sm text-slate-600 border border-slate-200">
                  app.recruitify.io/dashboard
                </div>
              </div>
            </div>
            
            {/* Dashboard content placeholder */}
            <div className="aspect-[16/9] bg-slate-50 relative">
              <Image
                src="/images/dashboard-preview.png"
                alt="Recruitify Dashboard"
                fill
                className="object-cover object-top"
              />
              {/* Fallback gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent" />
            </div>
          </div>
        </motion.div>

        {/* Description */}
        <motion.div 
          className="mt-12 text-center max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <p className="text-white/80 mb-6">
            Our intuitive dashboard gives your HR team a complete overview of all job postings, candidates, and matches in one place. Track progress, collaborate with team members, and make data-driven hiring decisions.
          </p>
          <Button asChild className="bg-white hover:bg-slate-100 text-[#0D9488] rounded-lg px-6">
            <Link href="/auth/register">
              See the full dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </div>

      {/* Wave divider into teal-50 (testimonials) */}
      <div className="mt-20">
        <WaveDivider fillColor="#0D9488" direction="down" />
      </div>
    </section>
  )
}
