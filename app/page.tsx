"use client"

import { useState } from "react"
import { Navbar } from "@/components/landing/navbar"
import { HeroSection } from "@/components/landing/hero-section"
import { UseCasesSection } from "@/components/landing/use-cases-section"
import { FeaturesSection } from "@/components/landing/features-section"
import { DashboardPreviewSection } from "@/components/landing/dashboard-preview-section"
import { UseCasesCardsSection } from "@/components/landing/use-cases-cards-section"
import { PricingSection } from "@/components/landing/pricing-section"
import { TestimonialsSection } from "@/components/landing/testimonials-section"
import { CTASection } from "@/components/landing/cta-section"
import { FAQSection } from "@/components/landing/faq-section"
import { ContactSection } from "@/components/landing/contact-section"
import { Footer } from "@/components/landing/footer"
import { LoginModal } from "@/components/landing/login-modal"

export default function LandingPage() {
  const [loginOpen, setLoginOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white">
      <Navbar onLoginClick={() => setLoginOpen(true)} />
      <main>
        <HeroSection />
        <UseCasesSection />
        <FeaturesSection />
        <DashboardPreviewSection />
        <UseCasesCardsSection />
        <PricingSection />
        <TestimonialsSection />
        <CTASection />
        <FAQSection />
        <ContactSection />
      </main>
      <Footer />
      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  )
}
