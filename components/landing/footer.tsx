"use client"

import { Linkedin, Twitter } from "lucide-react"
import { RevetlyLogo } from "./revetly-logo"

const COLUMNS = [
  {
    title: "Product",
    links: ["Features", "Pricing", "How it Works", "Changelog"],
  },
  {
    title: "Company",
    links: ["About", "Blog", "Careers", "Press"],
  },
  {
    title: "Legal",
    links: ["Privacy", "Terms", "DSGVO", "Imprint"],
  },
  {
    title: "Support",
    links: ["FAQ", "Contact", "hello@revetly.ai"],
  },
]

export function Footer() {
  return (
    <footer className="bg-[#0A0F0C] px-6 pt-16 pb-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          {/* Logo + tagline */}
          <div className="col-span-2 md:col-span-1">
            <RevetlyLogo />
            <p className="font-dm-sans mt-4 max-w-[200px] text-sm leading-relaxed text-[#A8C4B0]">
              More time for what matters.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="font-syne text-sm font-bold text-white">{col.title}</h3>
              <ul className="mt-4 flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="font-dm-sans text-sm text-[#A8C4B0] transition-colors hover:text-[#1DB954]"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[#2D4A35] pt-6 sm:flex-row">
          <p className="font-dm-sans text-sm text-[#A8C4B0]">
            © 2026 REVETLY · Built in Austria · Trusted across Europe
          </p>
          <div className="flex items-center gap-3">
            <a
              href="#"
              aria-label="LinkedIn"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-[#2D4A35] text-[#A8C4B0] transition-colors hover:border-[#1DB954] hover:text-[#1DB954]"
            >
              <Linkedin className="h-4 w-4" />
            </a>
            <a
              href="#"
              aria-label="X"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-[#2D4A35] text-[#A8C4B0] transition-colors hover:border-[#1DB954] hover:text-[#1DB954]"
            >
              <Twitter className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
