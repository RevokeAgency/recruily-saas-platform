import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"

import { BookingView } from "@/components/scheduling/booking-view"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Termin wählen — Revetly",
  // Persönliche Buchungslinks gehören nicht in Suchmaschinen.
  robots: { index: false, follow: false, nocache: true },
}

/**
 * Buchungsseite für Bewerber. Ohne Anmeldung erreichbar, der Token im Pfad ist
 * der Nachweis. Die Seite selbst rendert nichts Personenbezogenes serverseitig:
 * Alle Inhalte kommen über die API, die den Token prüft.
 */
export default async function BookingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  return (
    <div className="min-h-screen bg-[var(--rv-mist)] font-sans">
      <header className="border-b border-[var(--app-line)] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[880px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" aria-label="Revetly" className="inline-flex items-center">
            <Image
              src="/revetly/LogoEntwurf-trim.png"
              alt="Revetly"
              width={116}
              height={28}
              className="h-7 w-auto"
              priority
            />
          </Link>
          <span className="text-sm text-muted-foreground">Terminbuchung</span>
        </div>
      </header>

      <main>
        <BookingView token={token} />
      </main>

      <footer className="mx-auto max-w-[880px] px-4 pb-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-t border-[var(--app-line)] pt-6 text-xs text-muted-foreground">
          <span>Terminbuchung über Revetly</span>
          <div className="flex gap-4">
            <Link href="/datenschutz" className="hover:text-foreground">Datenschutz</Link>
            <Link href="/impressum" className="hover:text-foreground">Impressum</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
