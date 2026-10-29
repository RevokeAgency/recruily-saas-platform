"use client"

import dynamic from "next/dynamic"
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

// Erst laden, wenn jemand auf "Anmelden" klickt: Das Fenster bringt den
// Supabase-Client und die Dialog-Bausteine mit, die sonst jeder Besucher
// der Startseite herunterlädt.
const LoginModal = dynamic(() => import("@/components/landing/login-modal").then((m) => m.LoginModal), { ssr: false })

// Reihenfolge nach Positionierung v2: erst das Problem, dann der Ablauf als
// Überblick, danach die Bausteine im Detail (Match Analyse, Gespräch,
// Entscheidung beim Menschen, Automatik), dann für wen, Datenschutz, Preise.
export function LandingPage() {
  const [loginOpen, setLoginOpen] = useState(false)
  // Einmal geöffnet, bleibt das Fenster eingehängt, damit es sauber ausblendet.
  const [loginLoaded, setLoginLoaded] = useState(false)
  const openLogin = () => {
    setLoginLoaded(true)
    setLoginOpen(true)
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      <RvNavbar onLoginClick={openLogin} />
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
      {loginLoaded && <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />}
    </div>
  )
}
