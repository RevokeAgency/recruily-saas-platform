import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, ArrowUpRight } from "lucide-react"

/**
 * Kopf- und Fußbereich der Blogseiten.
 *
 * Bewusst eigenständig statt RvNavbar/RvFooter: Die Landing-Navigation besteht
 * aus Sprungmarken (#features, #pricing …), die es hier nicht gibt. Der Blog
 * wird außerdem in einem neuen Tab geöffnet, deshalb führt der einzige
 * Rücksprung direkt auf die Startseite.
 */
export function BlogHeader() {
  return (
    <header className="border-b border-[rgba(12,26,22,.10)] bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[820px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" aria-label="Revetly Startseite" className="inline-flex items-center">
          <Image
            src="/revetly/LogoEntwurf-trim.png"
            alt="Revetly"
            width={116}
            height={28}
            className="h-7 w-auto"
            priority
          />
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/blog"
            className="hidden rounded-full px-3.5 py-1.5 text-sm font-semibold text-[var(--rv-ink-soft)] transition-colors hover:text-[var(--rv-green-deep)] sm:inline-flex"
          >
            Alle Beiträge
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(12,26,22,.14)] bg-white px-3.5 py-1.5 text-sm font-medium text-[var(--rv-ink-soft)] transition-colors hover:border-[var(--rv-ink)] hover:text-[var(--rv-ink)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Zur Startseite
          </Link>
        </div>
      </div>
    </header>
  )
}

export function BlogFooter() {
  return (
    <footer className="border-t border-[rgba(12,26,22,.10)] bg-white">
      <div className="mx-auto max-w-[820px] px-4 py-10 sm:px-6">
        <div className="rounded-[var(--rv-radius-lg)] border border-[rgba(12,26,22,.10)] bg-[var(--rv-mist)] p-[28px_26px]">
          <h2 className="text-[1.28rem] leading-[1.3] font-bold tracking-[-0.02em] text-[var(--rv-ink)]">
            Bewerbungen sortieren sich nicht von selbst.
          </h2>
          <p className="mt-2.5 text-[.94rem] leading-[1.62] text-[var(--rv-muted)]">
            Revetly liest Lebenslauf und Anschreiben, bewertet die Passung zur Stelle und
            begründet jeden Punkt. Auf EU-Servern, ohne Training auf Bewerberdaten.
          </p>
          <Link
            href="/auth/register"
            className="rv-btn rv-btn-shine mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-[var(--rv-green)] px-6 py-3.5 text-sm font-bold tracking-tight text-[#0C1A16] shadow-[0_10px_26px_-14px_rgba(22,199,124,.55)] transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-px hover:bg-[var(--rv-green-deep)]"
          >
            Kostenlos testen
            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.4} />
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-t border-[rgba(12,26,22,.10)] pt-6 text-[.85rem] text-[var(--rv-muted)]">
          <span>&copy; 2026 Revetly. Alle Rechte vorbehalten.</span>
          <div className="flex gap-[18px]">
            <Link href="/datenschutz" className="hover:text-[var(--rv-green-deep)]">Datenschutz</Link>
            <Link href="/impressum" className="hover:text-[var(--rv-green-deep)]">Impressum</Link>
            <Link href="/agb" className="hover:text-[var(--rv-green-deep)]">AGB</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
