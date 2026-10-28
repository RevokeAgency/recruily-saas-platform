import { LandingPage } from "@/components/landing/landing-page"
import { pageMetadata } from "@/lib/seo/page-metadata"
import { siteJsonLd } from "@/lib/seo/site-schema"

// Server-Hülle der Startseite: Metadaten mit Canonical und og:url sowie die
// strukturierten Daten. Die Seite selbst ist eine Client-Komponente.
export const metadata = pageMetadata({
  title: "KI-Recruiting-Software für den DACH-Raum | Revetly",
  description:
    "Revetly übernimmt alles zwischen Stellenanzeige und Zusage: Bewerbungen sammeln, Passung prüfen, Gespräche planen. Die Entscheidung triffst du. Verarbeitung in der EU.",
  path: "/",
})

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd()).replace(/</g, "\\u003c") }}
      />
      <LandingPage />
    </>
  )
}
