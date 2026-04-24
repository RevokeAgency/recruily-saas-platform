"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.5, ease: "easeOut" }
}

const testimonials = [
  {
    quote: "Setup was quick and the interface is intuitive. Our entire HR team was able to start using it immediately with minimal training.",
    name: "Emma Rodriguez",
    role: "Head of People, Future Finance",
    initials: "ER",
  },
  {
    quote: "Recruitify has transformed how we hire. We've cut our time-to-hire in half and the quality of candidates has improved significantly.",
    name: "Michael Chen",
    role: "HR Director, TechStart GmbH",
    initials: "MC",
  },
  {
    quote: "The AI matching is incredibly accurate. It understands the nuances of our job requirements and finds candidates we would have missed.",
    name: "Sarah Weber",
    role: "Talent Acquisition Lead, InnovateCo",
    initials: "SW",
  },
]

export function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(0)

  const prev = () => {
    setCurrentIndex((i) => (i === 0 ? testimonials.length - 1 : i - 1))
  }

  const next = () => {
    setCurrentIndex((i) => (i === testimonials.length - 1 ? 0 : i + 1))
  }

  const current = testimonials[currentIndex]

  return (
    <section className="pt-20 pb-20 relative overflow-hidden bg-white">
      {/* Minimal vertical lines - right */}
      <div className="absolute top-16 right-16 flex gap-3 opacity-20 pointer-events-none">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-0.5 h-12 bg-slate-400 rounded-full" />
        ))}
      </div>

      {/* Subtle gradient arc - right */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[350px] h-[350px] pointer-events-none">
        <div className="w-full h-full rounded-full bg-gradient-to-l from-slate-100/60 to-transparent" style={{ clipPath: "inset(0 0 0 50%)" }} />
      </div>

      

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <motion.div 
          className="text-center mb-16"
          {...fadeInUp}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Why HR Teams Love Recruitify
          </h2>
          <p className="text-lg text-slate-600">
            See what our customers have to say about Recruitify.
          </p>
        </motion.div>

        {/* Testimonial Card */}
        <motion.div 
          className="relative"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* Navigation Buttons */}
          <Button
            variant="outline"
            size="icon"
            onClick={prev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-16 hidden lg:flex rounded-lg border-slate-200"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={next}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-16 hidden lg:flex rounded-lg border-slate-200"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center shadow-sm">
            {/* Indicator dots */}
            <div className="flex justify-center gap-2 mb-8">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`w-8 h-1 rounded-full transition-colors ${
                    i === currentIndex ? "bg-[#0D9488]" : "bg-slate-200"
                  }`}
                />
              ))}
            </div>

            {/* Quote with animation */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <blockquote className="text-xl sm:text-2xl text-slate-900 italic leading-relaxed mb-8">
                  "{current.quote}"
                </blockquote>

                {/* Author */}
                <div className="flex flex-col items-center">
                  <Avatar className="h-14 w-14 mb-4 bg-slate-200">
                    <AvatarFallback className="text-slate-500 text-sm">
                      {current.initials}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-semibold text-slate-900">{current.name}</p>
                  <p className="text-sm text-slate-500">{current.role}</p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Mobile Navigation */}
          <div className="flex justify-center gap-4 mt-6 lg:hidden">
            <Button variant="outline" size="icon" onClick={prev} className="rounded-lg border-slate-200">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={next} className="rounded-lg border-slate-200">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>

        {/* Company logos placeholder */}
        <motion.div 
          className="flex justify-center gap-8 mt-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="w-24 h-28 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-200">
              <div className="w-3 h-3 rounded-full bg-slate-300" />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
