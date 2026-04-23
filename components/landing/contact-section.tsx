"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Mail, Phone, MapPin, Send } from "lucide-react"
import { toast } from "sonner"

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
    <section id="contact" className="py-20 bg-slate-50 relative overflow-hidden">
      {/* Decorative wave on top left */}
      <div className="absolute top-10 left-10 w-32 opacity-20">
        <svg viewBox="0 0 100 30" className="w-full text-slate-400">
          <path d="M0,15 Q12.5,0 25,15 T50,15 T75,15 T100,15" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>

      {/* Large decorative circle on right */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[400px] h-[400px]">
        <div className="w-full h-full rounded-full bg-slate-200/60" style={{ clipPath: "inset(0 0 0 50%)" }} />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Get in Touch
          </h2>
          <p className="text-lg text-slate-600">
            {"Have questions or need a personalized demo? We're here to help."}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Contact Info Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 relative overflow-hidden">
            {/* Decorative gradient */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#0D9488]/10 to-transparent rounded-bl-full" />
            
            <h3 className="text-xl font-semibold text-slate-900 mb-8">Contact Information</h3>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#0D9488]/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="h-5 w-5 text-[#0D9488]" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Email</p>
                  <p className="text-slate-600">info@recruitify.com</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#0D9488]/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="h-5 w-5 text-[#0D9488]" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Phone</p>
                  <p className="text-slate-600">+49 30 123 456 789</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#0D9488]/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-5 w-5 text-[#0D9488]" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Address</p>
                  <p className="text-slate-600">Friedrichstraße 123</p>
                  <p className="text-slate-600">10117 Berlin, Germany</p>
                </div>
              </div>
            </div>

            {/* Decorative image placeholder */}
            <div className="absolute bottom-4 left-4 w-24 h-20 bg-slate-100 rounded-lg opacity-50" />
          </div>

          {/* Contact Form Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
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
                className="w-full bg-[#0D9488] hover:bg-[#0B7C72] text-white rounded-lg"
              >
                <Send className="mr-2 h-4 w-4" />
                {loading ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
