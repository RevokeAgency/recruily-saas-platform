"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { RevetlyLogo } from "./revetly-logo"

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
]

export function Navbar({ onLoginClick }: { onLoginClick?: () => void }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const scrollToSection = (href: string) => {
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" })
    setMobileMenuOpen(false)
  }

  return (
    <nav
      className="sticky top-0 z-50 rv-fade-down border-b transition-colors"
      style={{
        backgroundColor: scrolled ? "rgba(13,31,20,0.92)" : "#0D1F14",
        borderColor: "#2D4A35",
        backdropFilter: scrolled ? "blur(10px)" : "none",
      }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" aria-label="REVETLY home">
            <RevetlyLogo />
          </Link>

          {/* Center nav */}
          <div className="hidden items-center gap-9 md:flex">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollToSection(link.href)}
                className="group relative font-dm-sans text-sm text-white/80 transition-colors hover:text-white"
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
              className="font-dm-sans text-sm text-white/90 transition-colors hover:text-white"
            >
              Log in
            </button>
            <Link
              href="/auth/register"
              className="rounded-[6px] px-4 py-2 font-dm-sans text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.03]"
              style={{ backgroundColor: "#1DB954" }}
            >
              Get Started Free
            </Link>
          </div>

          {/* Mobile button */}
          <button
            className="p-2 text-white md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t py-4 md:hidden" style={{ borderColor: "#2D4A35" }}>
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollToSection(link.href)}
                  className="text-left font-dm-sans text-sm text-white/80 hover:text-white"
                >
                  {link.label}
                </button>
              ))}
              <div className="flex flex-col gap-3 border-t pt-4" style={{ borderColor: "#2D4A35" }}>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    onLoginClick?.()
                  }}
                  className="text-left font-dm-sans text-sm text-white/90"
                >
                  Log in
                </button>
                <Link
                  href="/auth/register"
                  className="rounded-[6px] px-4 py-2 text-center font-dm-sans text-sm font-semibold text-white"
                  style={{ backgroundColor: "#1DB954" }}
                >
                  Get Started Free
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
