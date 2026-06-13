"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { RevetlyLogo } from "./revetly-logo"

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "Resources", href: "#resources" },
  { label: "FAQ", href: "#faq" },
]

export function Navbar({ onLoginClick }: { onLoginClick?: () => void }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const scrollToSection = (href: string) => {
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" })
    setMobileMenuOpen(false)
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 rv-fade-down transition-all duration-300 ${
        scrolled ? "border-b border-[#E0E0DC] bg-white/85 backdrop-blur-md" : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="#top" aria-label="REVETLY home">
          <RevetlyLogo dark />
        </Link>

        {/* Center nav */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollToSection(link.href)}
              className="group relative font-dm-sans text-sm text-[#6B6B6B] transition-colors hover:text-[#0A0A0A]"
            >
              {link.label}
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-[#1DB954] transition-all duration-300 group-hover:w-full" />
            </button>
          ))}
        </div>

        {/* Right */}
        <div className="hidden items-center gap-5 md:flex">
          <button
            onClick={onLoginClick}
            className="font-dm-sans text-sm text-[#6B6B6B] transition-colors hover:text-[#0A0A0A]"
          >
            Log in
          </button>
          <Link
            href="/auth/register"
            className="rounded-full bg-[#0A0A0A] px-5 py-2.5 font-dm-sans text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.03] hover:bg-[#1a1a1a]"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile button */}
        <button
          className="flex h-11 w-11 items-center justify-center rounded-lg text-[#0A0A0A] md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {mobileMenuOpen && (
        <div className="border-t border-[#E0E0DC] bg-white md:hidden">
          <div className="flex flex-col gap-1 px-5 py-4">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollToSection(link.href)}
                className="rounded-lg px-2 py-3 text-left font-dm-sans text-base text-[#0A0A0A]"
              >
                {link.label}
              </button>
            ))}
            <div className="mt-2 flex flex-col gap-3 border-t border-[#E0E0DC] pt-4">
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  onLoginClick?.()
                }}
                className="text-left font-dm-sans text-base text-[#6B6B6B]"
              >
                Log in
              </button>
              <Link
                href="/auth/register"
                className="rounded-full bg-[#0A0A0A] px-5 py-3 text-center font-dm-sans text-sm font-semibold text-white"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
