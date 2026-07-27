import Link from "next/link"
import Image from "next/image"
import { ArrowLeft } from "lucide-react"

/**
 * Shared shell for the public legal pages (Datenschutz / Impressum / AGB) so
 * they read as one consistent Revetly document.
 */
export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string
  intro?: string
  children: React.ReactNode
}) {
  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-16">
      <article className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center" aria-label="Zur Startseite">
            <Image
              src="/revetly/LogoEntwurf-trim.png"
              alt="Revetly"
              width={116}
              height={28}
              className="h-7 w-auto"
              priority
            />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--app-line)] bg-white px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zur Startseite
          </Link>
        </div>
        <h1 className="mt-8 text-[2rem] font-bold leading-tight tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Stand: {new Date().getFullYear()}</p>
        {intro && <p className="mt-4 text-[0.95rem] leading-relaxed text-muted-foreground">{intro}</p>}

        <div className="mt-8 space-y-8 text-[0.95rem] leading-relaxed text-[var(--rv-ink-soft)]">
          {children}
        </div>
      </article>
    </main>
  )
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  )
}
