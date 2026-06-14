"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { RevetlyLogo } from "./revetly-logo"

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Services", href: "#services" },
  { label: "Reviews", href: "#testimonials" },
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
    <nav
      className={`rv-fade-down fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white/90 shadow-sm backdrop-blur-md" : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="flex h-[72px] items-center justify-between">
          <Link href="/" aria-label="REVETLY home">
            <RevetlyLogo />
          </Link>

          {/* Center nav */}
          <div className="hidden items-center gap-8 lg:flex">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollToSection(link.href)}
                className="group relative font-sans text-sm font-medium text-[#3F4A45] transition-colors hover:text-[#081314]"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-[#4EB0BE] transition-all duration-300 group-hover:w-full" />
              </button>
            ))}
          </div>

          {/* Right */}
          <div className="hidden items-center gap-4 lg:flex">
            <button
              onClick={onLoginClick}
              className="font-sans text-sm font-medium text-[#3F4A45] transition-colors hover:text-[#081314]"
            >
              Log in
            </button>
            <Link
              href="/auth/register"
              className="rounded-full bg-[#4EB0BE] px-5 py-2.5 font-sans text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#2B6169] hover:shadow-md"
            >
              Get Started Free
            </Link>
          </div>

          {/* Mobile button */}
          <button
            className="p-2 text-[#081314] lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="mb-4 rounded-2xl border border-[#E5E9E7] bg-white p-5 shadow-lg lg:hidden">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollToSection(link.href)}
                  className="text-left font-sans text-sm font-medium text-[#3F4A45]"
                >
                  {link.label}
                </button>
              ))}
              <div className="flex flex-col gap-3 border-t border-[#E5E9E7] pt-4">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    onLoginClick?.()
                  }}
                  className="text-left font-sans text-sm font-medium text-[#3F4A45]"
                >
                  Log in
                </button>
                <Link
                  href="/auth/register"
                  className="rounded-full bg-[#4EB0BE] px-5 py-2.5 text-center font-sans text-sm font-semibold text-white"
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
