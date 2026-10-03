import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Clock, Link2Off } from "lucide-react"

import { ReviewBoard } from "@/components/review/review-board"
import { loadReviewPage, reviewDb } from "@/lib/review/store"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Bewerbungen ansehen — Revetly",
  // Persönliche Freigabe-Links gehören nicht in Suchmaschinen.
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
}

const GONE = {
  expired: { icon: Clock, title: "Dieser Link ist abgelaufen", text: "Frag bei der Person nach, die ihn dir geschickt hat. Sie kann dir einen neuen schicken." },
  revoked: { icon: Link2Off, title: "Dieser Link wurde zurückgezogen", text: "Die Bewerbungen sind über diesen Link nicht mehr zu sehen." },
  not_found: { icon: Link2Off, title: "Link nicht gefunden", text: "Prüfe, ob der Link vollständig kopiert wurde." },
} as const

/**
 * Freigabeseite für die Fachabteilung. Ohne Anmeldung, der Token im Pfad ist
 * die Berechtigung. Zeigt Zusammenfassung und Lebenslauf der ausgewählten
 * Bewerber und nimmt pro Person ein Urteil mit Kommentar an.
 */
export default async function ReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const db = reviewDb()
  const data = db ? await loadReviewPage(db, token) : ({ status: "not_found" } as const)

  return (
    <div className="min-h-screen bg-[var(--rv-mist)] font-sans">
      <header className="border-b border-[var(--app-line)] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[880px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" aria-label="Revetly" className="inline-flex items-center">
            <Image src="/revetly/LogoEntwurf-trim.png" alt="Revetly" width={116} height={28} className="h-7 w-auto" priority />
          </Link>
          <span className="text-sm text-muted-foreground">Einschätzung zu Bewerbungen</span>
        </div>
      </header>

      <main>
        {data.status === "ok" ? (
          <ReviewBoard token={token} data={data} />
        ) : (
          <div className="mx-auto max-w-[520px] px-4 py-16 text-center">
            <div className="rounded-[var(--rv-radius-lg)] border border-[var(--app-line)] bg-white px-6 py-14 text-center shadow-[var(--rv-shadow-sm)]">
              {(() => {
                const g = GONE[data.status]
                const Icon = g.icon
                return (
                  <>
                    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--rv-mist)]">
                      <Icon className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h1 className="text-xl font-bold text-foreground">{g.title}</h1>
                    <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">{g.text}</p>
                  </>
                )
              })()}
            </div>
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-[880px] px-4 pb-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-t border-[var(--app-line)] pt-6 text-xs text-muted-foreground">
          <span>Vertraulich. Nur für die Person bestimmt, an die der Link geschickt wurde.</span>
          <div className="flex gap-4">
            <Link href="/datenschutz" className="hover:text-foreground">Datenschutz</Link>
            <Link href="/impressum" className="hover:text-foreground">Impressum</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
