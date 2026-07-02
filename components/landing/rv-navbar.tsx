"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Menu, X } from "lucide-react"

import { RvArrowIcon, RvButton } from "./rv-button"

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Produkt", href: "#services" },
  { label: "Preise", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
]

/**
 * Floating glass pill nav (index.html .nav / .nav-inner): fixed with a margin
 * that shrinks on scroll, translucent blurred pill bar, logo centered-left,
 * link row, gradient-ring "Anmelden" + primary CTA.
 */
export function RvNavbar({ onLoginClick }: { onLoginClick?: () => void }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const scrollToSection = (href: string) => {
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" })
    setMobileOpen(false)
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-[100] px-4 transition-[top] duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] sm:px-6 lg:px-8 ${
        scrolled ? "top-[9px]" : "top-4"
      }`}
    >
      <div
        className={`relative mx-auto flex max-w-[1200px] items-center justify-between rounded-[20px] border border-white/55 pr-3 pl-4 shadow-[0_16px_44px_-20px_rgba(12,26,22,.40),inset_0_1px_0_rgba(255,255,255,.65)] backdrop-blur-xl backdrop-saturate-[1.7] transition-[height,background-color,box-shadow,border-radius] duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          scrolled ? "h-14 rounded-2xl bg-white/84" : "h-16 bg-white/62"
        }`}
      >
        <Link href="/" aria-label="Revetly Startseite" className="inline-flex items-center">
          <Image
            src="/revetly/LogoEntwurf.png"
            alt="Revetly"
            width={51}
            height={36}
            className="h-9 w-auto"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollToSection(link.href)}
              className="rounded-[11px] px-3.5 py-2 text-sm font-semibold text-[#2C3D38] transition-colors hover:bg-[rgba(12,26,22,.055)] hover:text-[#0C1A16]"
            >
              {link.label}
            </button>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <RvButton variant="ghostRing" size="sm" onClick={onLoginClick}>
            Anmelden
          </RvButton>
          <RvButton variant="primary" size="sm" asChild>
            <Link href="/auth/register">
              Kostenlos starten
              <RvArrowIcon />
            </Link>
          </RvButton>
        </div>

        <button
          className="p-2 text-[#0C1A16] lg:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Menü öffnen"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {mobileOpen && (
          <div className="absolute inset-x-0 top-full rounded-b-[18px] border border-t-0 border-white/55 bg-white/94 p-3 backdrop-blur-xl backdrop-saturate-[1.6] lg:hidden">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollToSection(link.href)}
                  className="rounded-lg px-3.5 py-2.5 text-left text-sm font-semibold text-[#2C3D38]"
                >
                  {link.label}
                </button>
              ))}
            </div>
            <div className="mt-2 flex flex-col gap-2.5 border-t border-[rgba(12,26,22,.10)] px-1 pt-3 pb-1">
              <RvButton
                variant="ghostRing"
                onClick={() => {
                  setMobileOpen(false)
                  onLoginClick?.()
                }}
              >
                Anmelden
              </RvButton>
              <RvButton variant="primary" asChild>
                <Link href="/auth/register">
                  Kostenlos starten
                  <RvArrowIcon />
                </Link>
              </RvButton>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
