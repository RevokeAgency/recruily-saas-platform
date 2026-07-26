import Link from "next/link"

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
        <Link
          href="/"
          className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[var(--rv-green-deep)]"
        >
          Revetly
        </Link>
        <h1 className="mt-2 text-[2rem] font-bold leading-tight tracking-tight text-foreground">
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
