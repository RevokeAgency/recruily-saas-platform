"use client"

import { useState } from "react"
import { RvNavbar } from "@/components/landing/rv-navbar"
import { RvHero } from "@/components/landing/rv-hero"
import { RvProblem } from "@/components/landing/rv-problem"
import { RvHowItWorks } from "@/components/landing/rv-how-it-works"
import { RvServices } from "@/components/landing/rv-services"
import { RvInterview } from "@/components/landing/rv-interview"
import { RvDecision } from "@/components/landing/rv-decision"
import { RvAutomation } from "@/components/landing/rv-automation"
import { RvAudience } from "@/components/landing/rv-audience"
import { RvPrivacy } from "@/components/landing/rv-privacy"
import { RvPricing } from "@/components/landing/rv-pricing"
import { RvFaq } from "@/components/landing/rv-faq"
import { RvBlog } from "@/components/landing/rv-blog"
import { RvCta } from "@/components/landing/rv-cta"
import { RvFooter } from "@/components/landing/rv-footer"
import { LoginModal } from "@/components/landing/login-modal"

// Reihenfolge nach Positionierung v2: erst das Problem, dann der Ablauf als
// Überblick, danach die Bausteine im Detail (Match Analyse, Gespräch,
// Entscheidung beim Menschen, Automatik), dann für wen, Datenschutz, Preise.
export default function LandingPage() {
  const [loginOpen, setLoginOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white font-sans">
      <RvNavbar onLoginClick={() => setLoginOpen(true)} />
      <main id="top">
        <RvHero />
        <RvProblem />
        <RvHowItWorks />
        <RvServices />
        <RvInterview />
        <RvDecision />
        <RvAutomation />
        <RvAudience />
        <RvPrivacy />
        <RvPricing />
        <RvFaq />
        <RvBlog />
        <RvCta />
      </main>
      <RvFooter />
      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  )
}
