"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/landing/navbar"
import { HeroSection } from "@/components/landing/hero-section"
import { LogoBar } from "@/components/landing/logo-bar"
import { PlatformSection } from "@/components/landing/platform-section"
import { ServicesSection } from "@/components/landing/services-section"
import { HowItWorks } from "@/components/landing/how-it-works"
import { HowWeHelp } from "@/components/landing/how-we-help"
import { TestimonialsSection } from "@/components/landing/testimonials-section"
import { FinalCta } from "@/components/landing/final-cta"
import { Footer } from "@/components/landing/footer"
import { LoginModal } from "@/components/landing/login-modal"

export default function LandingPage() {
  const [loginOpen, setLoginOpen] = useState(false)
  const router = useRouter()

  return (
    <div className="rv min-h-screen bg-white font-sans">
      <Navbar onLoginClick={() => setLoginOpen(true)} />
      <main>
        {/* 1. Hero */}
        <HeroSection />
        {/* 2. Logo bar */}
        <LogoBar />
        {/* 3. Platform / features */}
        <PlatformSection />
        {/* 4. Services tabs */}
        <ServicesSection />
        {/* 5. How it works — dark green */}
        <HowItWorks />
        {/* 6. How we help — score rings */}
        <HowWeHelp />
        {/* 7. Testimonials */}
        <TestimonialsSection />
        {/* 8. Final CTA — dark green */}
        <FinalCta onGetStarted={() => router.push("/auth/register")} />
      </main>
      {/* 9. Footer */}
      <Footer />
      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  )
}
