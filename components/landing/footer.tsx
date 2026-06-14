"use client"

import { Linkedin, Twitter, Instagram } from "lucide-react"
import { RevetlyLogo } from "./revetly-logo"

const navigate = ["Home", "About", "Features", "Pricing", "FAQ"]
const follow = [
  { label: "LinkedIn", icon: Linkedin },
  { label: "X", icon: Twitter },
  { label: "Instagram", icon: Instagram },
]
const legal = ["Privacy", "Terms", "DSGVO"]

export function Footer() {
  return (
    <footer className="rv border-t border-[#E5E9E7] bg-[#F4F7F5] px-5 pt-16 pb-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          {/* Logo + tagline */}
          <div className="col-span-2 md:col-span-1">
            <RevetlyLogo />
            <p className="mt-4 max-w-[220px] font-sans text-sm leading-relaxed text-[#6B7280]">
              More time for what matters.
            </p>
          </div>

          {/* Navigate */}
          <div>
            <h3 className="font-sans text-sm font-bold text-[#0F3D2C]">Navigate</h3>
            <ul className="mt-4 flex flex-col gap-3">
              {navigate.map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="font-sans text-sm text-[#6B7280] transition-colors hover:text-[#1DB954]"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Follow */}
          <div>
            <h3 className="font-sans text-sm font-bold text-[#0F3D2C]">Follow</h3>
            <ul className="mt-4 flex flex-col gap-3">
              {follow.map(({ label, icon: Icon }) => (
                <li key={label}>
                  <a
                    href="#"
                    className="inline-flex items-center gap-2 font-sans text-sm text-[#6B7280] transition-colors hover:text-[#1DB954]"
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact + Legal */}
          <div>
            <h3 className="font-sans text-sm font-bold text-[#0F3D2C]">Contact</h3>
            <ul className="mt-4 flex flex-col gap-3">
              <li>
                <a
                  href="mailto:hello@revetly.ai"
                  className="font-sans text-sm text-[#6B7280] transition-colors hover:text-[#1DB954]"
                >
                  hello@revetly.ai
                </a>
              </li>
              {legal.map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="font-sans text-sm text-[#6B7280] transition-colors hover:text-[#1DB954]"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-[#E5E9E7] pt-6">
          <p className="font-sans text-sm text-[#6B7280]">
            © 2026 REVETLY. Built in Austria.
          </p>
        </div>
      </div>
    </footer>
  )
}
