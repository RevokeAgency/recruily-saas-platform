"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/landing/navbar"
import { HeroSection } from "@/components/landing/hero-section"
import { StatsBand } from "@/components/landing/stats-band"
import { AboutSection } from "@/components/landing/about-section"
import { PersonaSection } from "@/components/landing/persona-section"
import { HowItWorks } from "@/components/landing/how-it-works"
import { AiHighlight } from "@/components/landing/ai-highlight"
import { ChannelsTrust } from "@/components/landing/channels-trust"
import { FeatureGrid } from "@/components/landing/feature-grid"
import { PricingSection } from "@/components/landing/pricing-section"
import { TestimonialsSection } from "@/components/landing/testimonials-section"
import { FAQSection } from "@/components/landing/faq-section"
import { FinalCta } from "@/components/landing/final-cta"
import { Footer } from "@/components/landing/footer"
import { LoginModal } from "@/components/landing/login-modal"

export default function LandingPage() {
  const [loginOpen, setLoginOpen] = useState(false)
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#0D1F14] font-dm-sans">
      <Navbar onLoginClick={() => setLoginOpen(true)} />
      <main>
        {/* Hero — dark */}
        <HeroSection />
        {/* Stats / photo collage band — light */}
        <StatsBand />
        {/* About + integration logos — dark */}
        <AboutSection />
        {/* 3 Recruiting Profiles personas — dark */}
        <PersonaSection />
        {/* How it works / recruiting flow — dark */}
        <HowItWorks />
        {/* AI highlight w/ search mockup — light */}
        <AiHighlight />
        {/* Channels + compliance trust — dark */}
        <ChannelsTrust />
        {/* Feature cards 2x2 grid — light */}
        <FeatureGrid />
        {/* Pricing — light */}
        <PricingSection />
        {/* Testimonials — light */}
        <TestimonialsSection />
        {/* FAQ — light */}
        <FAQSection />
        {/* Final CTA — dark */}
        <FinalCta onGetStarted={() => router.push("/auth/register")} />
      </main>
      {/* Footer — near-black */}
      <Footer />
      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  )
}
