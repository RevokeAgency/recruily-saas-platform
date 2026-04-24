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
    <section className="pt-20 pb-0 bg-slate-900 relative overflow-hidden">
      {/* Subtle geometric accents */}
      <div className="absolute top-16 right-12 opacity-10 pointer-events-none">
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
          <p className="text-sm font-medium text-[#2DD4BF] mb-2">IMLRS Technology</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Your Dashboard at a Glance
          </h2>
          <p className="text-lg text-slate-300">
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
          <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
            {/* Browser header */}
            <div className="bg-slate-800 px-4 py-3 flex items-center gap-3 border-b border-slate-700">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-slate-700 rounded-lg px-4 py-1.5 text-sm text-slate-300 border border-slate-600">
                  app.recruitify.io/dashboard
                </div>
              </div>
            </div>
            
            {/* Dashboard content placeholder */}
            <div className="aspect-[16/9] bg-slate-700 relative">
              <Image
                src="/images/dashboard-preview.png"
                alt="Recruitify Dashboard"
                fill
                className="object-cover object-top"
              />
              {/* Fallback gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 to-transparent" />
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
          <p className="text-slate-300 mb-6">
            Our intuitive dashboard gives your HR team a complete overview of all job postings, candidates, and matches in one place. Track progress, collaborate with team members, and make data-driven hiring decisions.
          </p>
          <Button asChild className="bg-[#0D9488] hover:bg-[#0B7C72] text-white rounded-lg px-6">
            <Link href="/auth/register">
              See the full dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </div>

      {/* Wave divider into teal-50 (testimonials) */}
      <div className="mt-20">
        <WaveDivider fillColor="#f0fdfa" direction="down" />
      </div>
    </section>
  )
}
