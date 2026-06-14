"use client"

import { motion } from "framer-motion"
import { Rocket, Users, FileStack } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.5, ease: "easeOut" }
}

const useCases = [
  {
    icon: Rocket,
    title: "Startups hiring fast with few resources",
    description: "Find the right talent quickly to build your dream team without spending hours on resumes.",
  },
  {
    icon: Users,
    title: "Recruiting agencies handling many clients",
    description: "Scale your operations and serve more clients with AI-powered candidate matching.",
  },
  {
    icon: FileStack,
    title: "In-house HR teams overwhelmed with CVs",
    description: "Focus on strategic HR initiatives while AI handles the initial screening process.",
  },
]

export function UseCasesCardsSection() {
  return (
    <section className="py-20 bg-white relative overflow-hidden">
      {/* Dark accent shape - left */}
      <div className="absolute left-0 bottom-0 w-[200px] h-[300px] pointer-events-none">
        <div className="w-full h-full bg-slate-700/70 rounded-tr-full" />
      </div>

      {/* Subtle arc - right */}
      <svg className="absolute right-0 top-1/4 w-32 h-32 pointer-events-none opacity-15" viewBox="0 0 100 100">
        <path d="M100 0 Q 100 100, 0 100" fill="none" stroke="#94a3b8" strokeWidth="1" />
      </svg>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <motion.div 
          className="text-center mb-12"
          {...fadeInUp}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Use Cases
          </h2>
          <p className="text-lg text-slate-600">
            See how different organizations benefit from Recruily
          </p>
        </motion.div>

        {/* Cards Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {useCases.map((useCase, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, ease: "easeOut", delay: index * 0.1 }}
            >
              <Card className="border border-slate-200 rounded-2xl hover:shadow-lg transition-shadow h-full">
                <CardContent className="p-8 text-center">
                  <div className="w-14 h-14 rounded-full bg-[#4EB0BE]/10 flex items-center justify-center mx-auto mb-6">
                    <useCase.icon className="h-7 w-7 text-[#4EB0BE]" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">
                    {useCase.title}
                  </h3>
                  <p className="text-slate-600 text-sm">
                    {useCase.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
