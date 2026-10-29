import { ComingSoon } from "@/components/waitlist/coming-soon"
import { pageMetadata } from "@/lib/seo/page-metadata"
import { siteJsonLd } from "@/lib/seo/site-schema"

// Erreichbar nur unter "/": Im Wartelisten-Modus schreibt die Middleware die
// Startseite hierher um, der direkte Pfad leitet auf "/" (lib/launch.ts).
// Deshalb Canonical und og:url auf "/".
export const metadata = pageMetadata({
  title: "KI-Recruiting-Software für den DACH-Raum | Revetly",
  description:
    "Revetly liest Bewerbungen, prüft die Passung mit Beleg und plant die Gespräche. Die Entscheidung triffst du. Trag dich auf die Warteliste ein.",
  path: "/",
})

export default function ComingSoonPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd({ minimal: true })).replace(/</g, "\\u003c") }}
      />
      <ComingSoon />
    </>
  )
}
