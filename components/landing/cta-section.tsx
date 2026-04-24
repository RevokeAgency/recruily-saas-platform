"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function CTASection() {
  return (
    <section className="py-20 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
      {/* Subtle geometric accent - top right */}
      <svg className="absolute right-8 top-8 w-20 h-20 pointer-events-none opacity-15" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="38" fill="none" stroke="#94a3b8" strokeWidth="0.5" />
        <circle cx="40" cy="40" r="28" fill="none" stroke="#94a3b8" strokeWidth="0.5" />
        <circle cx="40" cy="40" r="18" fill="none" stroke="#94a3b8" strokeWidth="0.5" />
      </svg>

      {/* Dot accent - bottom left */}
      <div className="absolute bottom-8 left-8 grid grid-cols-2 gap-2 opacity-25 pointer-events-none">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-teal-400" />
        ))}
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Ready to Match Smarter?
          </h2>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            Join thousands of companies that have streamlined their recruitment process with Recruily.
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Button asChild size="lg" className="bg-[#0D9488] hover:bg-[#0B7C72] text-white rounded-lg px-8 py-6 text-lg">
            <Link href="/auth/register">
              Start for Free – No Credit Card Required
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
