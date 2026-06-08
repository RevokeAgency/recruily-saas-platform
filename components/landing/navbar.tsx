"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"

export function Navbar({ onLoginClick }: { onLoginClick?: () => void }) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const links = [
    { label: "Features", href: "#features" },
    { label: "How it Works", href: "#how-it-works" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ]

  return (
    <>
      <style>{`
        @keyframes navDown {
          from { opacity:0; transform:translateY(-16px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .rv-nav { animation: navDown 0.4s ease forwards; }
        .rv-navlink {
          position:relative; color:#4A4A4A;
          font-size:15px; text-decoration:none;
          padding-bottom:2px; transition:color 0.2s;
        }
        .rv-navlink::after {
          content:''; position:absolute; bottom:-2px; left:0;
          width:0; height:1.5px; background:#1DB954;
          transition:width 0.25s ease;
        }
        .rv-navlink:hover { color:#0A0A0A; }
        .rv-navlink:hover::after { width:100%; }
      `}</style>
      <nav
        className="rv-nav fixed top-0 left-0 right-0 z-50 transition-shadow duration-300"
        style={{
          backgroundColor: "#FFFFFF",
          borderBottom: "1px solid #E8E8E8",
          boxShadow: scrolled ? "0 2px 20px rgba(0,0,0,0.07)" : "none",
          fontFamily: "var(--font-dm-sans)",
        }}
      >
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <span style={{ width: 22, height: 22, borderRadius: 4, background: "#1DB954", display: "inline-block", flexShrink: 0 }} />
            <span style={{ fontFamily: "var(--font-syne)", fontWeight: 700, fontSize: 16, color: "#0A0A0A", letterSpacing: "0.1em" }}>REVETLY</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex" style={{ gap: 36, alignItems: "center" }}>
            {links.map((l) => (
              <a key={l.href} href={l.href} className="rv-navlink">{l.label}</a>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex" style={{ alignItems: "center", gap: 24 }}>
            <button
              onClick={onLoginClick}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 15, color: "#4A4A4A", fontFamily: "var(--font-dm-sans)" }}
            >
              Log in
            </button>
            <Link
              href="/auth"
              style={{ fontSize: 15, fontWeight: 500, color: "#FFFFFF", background: "#1DB954", padding: "10px 20px", borderRadius: 6, textDecoration: "none", transition: "background 0.2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#158A3E" }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#1DB954" }}
            >
              Get Started Free
            </Link>
          </div>

          {/* Mobile toggle */}
          <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)} style={{ background: "none", border: "none", cursor: "pointer", color: "#0A0A0A" }}>
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div style={{ background: "#FFFFFF", borderTop: "1px solid #E8E8E8", padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
            {links.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)} style={{ color: "#4A4A4A", textDecoration: "none", fontSize: 16 }}>{l.label}</a>
            ))}
            <hr style={{ border: "none", borderTop: "1px solid #E8E8E8", margin: "4px 0" }} />
            <button onClick={() => { onLoginClick?.(); setMobileOpen(false) }} style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: 16, color: "#4A4A4A", fontFamily: "var(--font-dm-sans)" }}>Log in</button>
            <Link href="/auth" style={{ fontSize: 15, fontWeight: 500, color: "#FFFFFF", background: "#1DB954", padding: "12px 20px", borderRadius: 6, textDecoration: "none", textAlign: "center" }}>
              Get Started Free
            </Link>
          </div>
        )}
      </nav>
    </>
  )
}
