"use client"

import { motion } from "framer-motion"
import { Sparkles, FileText, BarChart3, Users, Shield, Zap } from "lucide-react"
import { WaveDivider } from "./wave-divider"

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.5, ease: "easeOut" }
}

const features = [
  {
    icon: Sparkles,
    title: "AI Resume & Job Matching",
    description: "Our advanced algorithms find candidates that perfectly match your requirements, saving you hours of manual screening.",
  },
  {
    icon: FileText,
    title: "Instant Resume Summarization",
    description: "Get concise summaries of candidate qualifications and experience without reading through lengthy resumes.",
  },
  {
    icon: BarChart3,
    title: "Match Score with Explanation",
    description: "Understand exactly why a candidate is a good fit with detailed match explanations and scoring.",
  },
  {
    icon: Users,
    title: "Multi-user Team Access",
    description: "Collaborate with your team members on hiring decisions with role-based permissions and shared candidate pools.",
  },
  {
    icon: Shield,
    title: "GDPR-Compliant & Secure",
    description: "Your data is encrypted and handled according to the strictest privacy standards. We're fully GDPR compliant.",
  },
  {
    icon: Zap,
    title: "Easy Setup - No IT Required",
    description: "Get started in minutes with our intuitive interface. No technical knowledge required.",
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="pt-20 pb-0 bg-white relative overflow-hidden">
      {/* Minimal dot pattern - left */}
      <div className="absolute bottom-16 left-8 grid grid-cols-3 gap-2 opacity-30 pointer-events-none">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#0D9488]" />
        ))}
      </div>

      {/* Subtle arc - right */}
      <svg className="absolute right-0 top-1/3 w-64 h-64 pointer-events-none opacity-30" viewBox="0 0 200 200">
        <path d="M200 0 Q 200 200, 0 200" fill="none" stroke="#cbd5e1" strokeWidth="1" />
        <path d="M200 40 Q 200 200, 40 200" fill="none" stroke="#cbd5e1" strokeWidth="1" />
      </svg>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <motion.div 
          className="text-center mb-16"
          {...fadeInUp}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Powerful Features
          </h2>
          <p className="text-lg text-slate-600">
            Everything you need to streamline your recruitment process
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <motion.div 
              key={i} 
              className="text-center group"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, ease: "easeOut", delay: i * 0.1 }}
            >
              {/* Icon */}
              <div className="w-14 h-14 mx-auto mb-6 rounded-full bg-[#0D9488]/10 flex items-center justify-center group-hover:bg-[#0D9488]/20 transition-colors">
                <feature.icon className="h-6 w-6 text-[#0D9488]" />
              </div>
              
              {/* Content */}
              <h3 className="text-lg font-semibold text-slate-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
            ))}
        </div>
      </div>
      
      {/* Wave divider into dark section (Dashboard/IMLRS) */}
      <div className="mt-20">
        <WaveDivider fillColor="#0f172a" direction="up" />
      </div>
    </section>
  )
}
