import Link from "next/link"
import Image from "next/image"

const NAV_LINKS = [
  { label: "Home", href: "#top" },
  { label: "Features", href: "#features" },
  { label: "Produkt", href: "#services" },
  { label: "Preise", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
]

const SOCIAL_LINKS = ["LinkedIn", "X / Twitter", "XING", "YouTube"]

export function RvFooter() {
  return (
    <footer className="border-t border-[rgba(12,26,22,.10)] bg-white pt-16 pb-8">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mb-[50px] grid grid-cols-2 gap-10 sm:grid-cols-3 lg:grid-cols-[1.6fr_repeat(4,1fr)]">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <Link href="#top" className="inline-flex items-center">
              <Image src="/revetly/LogoEntwurf.png" alt="Revetly" width={170} height={120} className="h-[120px] w-auto" />
            </Link>
            <p className="mt-3.5 max-w-[260px] text-[.92rem] leading-[1.6] text-[var(--rv-muted)]">
              KI-gestütztes Recruiting für den DACH-Markt. Erklärbar, DSGVO-konform &amp; EU
              AI Act ready.
            </p>
          </div>
          <div>
            <h4 className="mb-[18px] text-[.78rem] font-bold tracking-[.1em] text-[var(--rv-ink)] uppercase">Navigieren</h4>
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="mb-3 block text-[.92rem] text-[var(--rv-muted)] transition-colors hover:text-[var(--rv-green-deep)]">
                {link.label}
              </a>
            ))}
          </div>
          <div>
            <h4 className="mb-[18px] text-[.78rem] font-bold tracking-[.1em] text-[var(--rv-ink)] uppercase">Folgen</h4>
            {SOCIAL_LINKS.map((label) => (
              <a key={label} href="#" className="mb-3 block text-[.92rem] text-[var(--rv-muted)] transition-colors hover:text-[var(--rv-green-deep)]">
                {label}
              </a>
            ))}
          </div>
          <div>
            <h4 className="mb-[18px] text-[.78rem] font-bold tracking-[.1em] text-[var(--rv-ink)] uppercase">Kontakt</h4>
            <div className="mb-3 text-[.92rem] leading-[1.5] text-[var(--rv-muted)]">+43 (0) 1 234 567</div>
            <div className="mb-3 text-[.92rem] leading-[1.5] text-[var(--rv-muted)]">hallo@revetly.com</div>
          </div>
          <div>
            <h4 className="mb-[18px] text-[.78rem] font-bold tracking-[.1em] text-[var(--rv-ink)] uppercase">Standort</h4>
            <div className="mb-3 text-[.92rem] leading-[1.5] text-[var(--rv-muted)]">
              Mariahilfer Straße 1
              <br />
              1060 Wien, Österreich
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-t border-[rgba(12,26,22,.10)] pt-[26px] text-[.85rem] text-[var(--rv-muted)]">
          <span>&copy; 2026 Revetly. Alle Rechte vorbehalten.</span>
          <div className="flex gap-[18px]">
            {/* Placeholder targets — Impressum/Datenschutz/AGB copy is explicitly out of scope, see DESIGN_HANDOFF.md §5 */}
            <a href="#" className="hover:text-[var(--rv-green-deep)]">Datenschutz</a>
            <a href="#" className="hover:text-[var(--rv-green-deep)]">Impressum</a>
            <a href="#" className="hover:text-[var(--rv-green-deep)]">AGB</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
