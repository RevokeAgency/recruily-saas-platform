import type { Metadata } from "next"

// ─────────────────────────────────────────────────────────────────────────────
// Metadaten öffentlicher Seiten an einer Stelle.
//
// Next übernimmt openGraph und twitter aus dem Layout nur, wenn die Seite
// selbst keine setzt; sobald sie eine setzt, ersetzt sie die des Layouts
// komplett. Deshalb baut dieser Helfer alles vollständig: Titel,
// Beschreibung, Canonical, og:url, Bild, Twitter-Karte.
//
// Titel höchstens 60 Zeichen inklusive " | Revetly" (SEO-Audit 28.10.2026),
// darüber kürzt Google in den Ergebnissen.
// ─────────────────────────────────────────────────────────────────────────────

export const BRAND_SUFFIX = " | Revetly"
export const TITLE_MAX = 60
export const OG_IMAGE = { url: "/revetly/og-image.jpg", width: 1200, height: 630 }

/**
 * Wählt den ersten Titel, der mit Marke in TITLE_MAX passt. Passt keiner,
 * wird der letzte an einer Wortgrenze gekürzt.
 */
export function fitTitle(candidates: string[], suffix = BRAND_SUFFIX, max = TITLE_MAX): string {
  const clean = candidates.map((c) => c.replace(/\s+/g, " ").trim()).filter(Boolean)
  for (const c of clean) if (c.length + suffix.length <= max) return c + suffix
  const last = clean[clean.length - 1] ?? ""
  const room = max - suffix.length - 1
  const cut = last.slice(0, room)
  const atWord = cut.lastIndexOf(" ") > room * 0.6 ? cut.slice(0, cut.lastIndexOf(" ")) : cut
  return `${atWord.replace(/[\s,;:·\-/(]+$/, "")}…${suffix}`
}

export function pageMetadata(opts: {
  /** Fertiger Titel (mit Marke), z. B. aus fitTitle. */
  title: string
  description: string
  /** Pfad ab der Domain, z. B. "/impressum". */
  path: string
  noindex?: boolean
  type?: "website" | "article"
  /** Titel für Vorschaukarten, wenn er vom Seitentitel abweichen soll. */
  socialTitle?: string
  extra?: Partial<Metadata>
}): Metadata {
  const social = opts.socialTitle ?? opts.title
  return {
    title: { absolute: opts.title },
    description: opts.description,
    alternates: { canonical: opts.path },
    ...(opts.noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: opts.type ?? "website",
      siteName: "Revetly",
      locale: "de_DE",
      url: opts.path,
      title: social,
      description: opts.description,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: social,
      description: opts.description,
      images: [OG_IMAGE.url],
    },
    ...opts.extra,
  }
}
