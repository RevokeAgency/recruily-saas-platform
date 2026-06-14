"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Mail, Phone, MapPin, Send } from "lucide-react"
import { toast } from "sonner"
import { WaveDivider } from "./wave-divider"

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.5, ease: "easeOut" }
}

export function ContactSection() {
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    // Simulate form submission
    await new Promise((r) => setTimeout(r, 1000))
    toast.success("Message sent successfully!")
    setLoading(false)
    ;(e.target as HTMLFormElement).reset()
  }

  return (
    <section id="contact" className="pt-0 pb-0 bg-white relative overflow-hidden">
      {/* Minimal wave accent - top left */}
      <svg className="absolute top-8 left-6 w-16 h-8 pointer-events-none opacity-25" viewBox="0 0 60 24">
        <path d="M0 12 C 15 6, 30 18, 45 12 S 60 6, 60 12" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
      </svg>

      {/* Subtle gradient arc - right */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[350px] h-[350px] pointer-events-none">
        <div className="w-full h-full rounded-full bg-gradient-to-l from-slate-200/40 to-transparent" style={{ clipPath: "inset(0 0 0 50%)" }} />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <motion.div 
          className="text-center mb-12"
          {...fadeInUp}
        >
          <p className="text-sm font-medium text-[#4EB0BE] mb-2">Support & Inquiries</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Get in Touch
          </h2>
          <p className="text-lg text-slate-600">
            {"Have questions or need a personalized demo? We're here to help."}
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Contact Info Card */}
          <motion.div 
            className="bg-white rounded-2xl border border-slate-200 p-8 relative overflow-hidden"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5 }}
          >
            {/* Decorative gradient */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#4EB0BE]/10 to-transparent rounded-bl-full" />
            
            <h3 className="text-xl font-semibold text-slate-900 mb-8">Contact Information</h3>

            <div className="space-y-6">
              {[
                { icon: Mail, label: "Email", value: "info@recruily.com" },
                { icon: Phone, label: "Phone", value: "+49 30 123 456 789" },
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  className="flex items-start gap-4"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="w-10 h-10 rounded-full bg-[#4EB0BE]/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="h-5 w-5 text-[#4EB0BE]" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{item.label}</p>
                    <p className="text-slate-600">{item.value}</p>
                  </div>
                </motion.div>
              ))}

              <motion.div 
                className="flex items-start gap-4"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                <div className="w-10 h-10 rounded-full bg-[#4EB0BE]/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-5 w-5 text-[#4EB0BE]" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Address</p>
                  <p className="text-slate-600">Friedrichstraße 123</p>
                  <p className="text-slate-600">10117 Berlin, Germany</p>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Contact Form Card */}
          <motion.div 
            className="bg-white rounded-2xl border border-slate-200 p-8"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5 }}
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="name" className="text-slate-700">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  required
                  className="mt-1.5 rounded-lg border-slate-200"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-slate-700">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  required
                  className="mt-1.5 rounded-lg border-slate-200"
                />
              </div>

              <div>
                <Label htmlFor="company" className="text-slate-700">Company</Label>
                <Input
                  id="company"
                  placeholder="Your Company"
                  className="mt-1.5 rounded-lg border-slate-200"
                />
              </div>

              <div>
                <Label htmlFor="message" className="text-slate-700">Message</Label>
                <Textarea
                  id="message"
                  placeholder="How can we help you?"
                  rows={4}
                  required
                  className="mt-1.5 rounded-lg border-slate-200 resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#4EB0BE] hover:bg-[#2B6169] text-white rounded-lg"
              >
                <Send className="mr-2 h-4 w-4" />
                {loading ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </motion.div>
        </div>
      </div>
      
      {/* Wave divider into teal (footer) */}
      <div className="mt-20">
        <WaveDivider fillColor="#4EB0BE" direction="down" />
      </div>
    </section>
  )
}
