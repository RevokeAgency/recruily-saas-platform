"use client"

import { useState } from "react"
import { Navbar } from "@/components/landing/navbar"
import { HeroSection } from "@/components/landing/hero-section"
import { UseCasesSection } from "@/components/landing/use-cases-section"
import { FeaturesSection } from "@/components/landing/features-section"
import { DashboardPreviewSection } from "@/components/landing/dashboard-preview-section"
import { TestimonialsSection } from "@/components/landing/testimonials-section"
import { PricingSection } from "@/components/landing/pricing-section"
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
        {/* Section 1: Hero - white, waves into teal-50 */}
        <HeroSection />
        {/* Section 2: Use Cases - teal-50, waves into white */}
        <UseCasesSection />
        {/* Section 3: Features - white, waves into dark */}
        <FeaturesSection />
        {/* Section 4: IMLRS/Dashboard - slate-900 (dark), waves into teal-50 */}
        <DashboardPreviewSection />
        {/* Section 5: Testimonials - teal-50, waves into white */}
        <TestimonialsSection />
        {/* Section 6: Pricing - white, waves into teal-50 */}
        <PricingSection />
        {/* Section 7: FAQ - teal-50, waves into white */}
        <FAQSection />
        {/* Section 8: Contact - white, waves into slate-900 */}
        <ContactSection />
      </main>
      {/* Section 9: Footer - slate-900 */}
      <Footer />
      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  )
}
