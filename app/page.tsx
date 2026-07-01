"use client"

import { useState } from "react"
import { RvNavbar } from "@/components/landing/rv-navbar"
import { RvHero } from "@/components/landing/rv-hero"
import { RvMarquee } from "@/components/landing/rv-marquee"
import { RvFeatures } from "@/components/landing/rv-features"
import { RvServices } from "@/components/landing/rv-services"
import { RvHowItWorks } from "@/components/landing/rv-how-it-works"
import { RvGrow } from "@/components/landing/rv-grow"
import { RvTestimonials } from "@/components/landing/rv-testimonials"
import { RvPricing } from "@/components/landing/rv-pricing"
import { RvFaq } from "@/components/landing/rv-faq"
import { RvCta } from "@/components/landing/rv-cta"
import { RvFooter } from "@/components/landing/rv-footer"
import { LoginModal } from "@/components/landing/login-modal"

export default function LandingPage() {
  const [loginOpen, setLoginOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white font-sans">
      <RvNavbar onLoginClick={() => setLoginOpen(true)} />
      <main id="top">
        <RvHero />
        <RvMarquee />
        <RvFeatures />
        <RvServices />
        <RvHowItWorks />
        <RvGrow />
        <RvTestimonials />
        <RvPricing />
        <RvFaq />
        <RvCta />
      </main>
      <RvFooter />
      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  )
}
