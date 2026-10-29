import { FAQS } from "@/lib/landing/faq"
import { PLANS, type PlanId } from "@/lib/plans"
import { absoluteUrl, SITE_URL } from "@/lib/site"

// ─────────────────────────────────────────────────────────────────────────────
// Strukturierte Daten der Startseite: Organisation, Website, Software mit den
// Preisen aus PLANS und die FAQ. Alles aus denselben Quellen wie die Seite,
// damit nichts auseinanderläuft.
// ─────────────────────────────────────────────────────────────────────────────

const ORG_ID = `${SITE_URL}/#organization`

const PAID: PlanId[] = ["starter", "growth", "pro"]

/**
 * `minimal`: nur Organisation und Website. Für die Coming-Soon-Seite, die
 * weder Preise noch FAQ zeigt; strukturierte Daten müssen zum Sichtbaren passen.
 */
export function siteJsonLd({ minimal = false }: { minimal?: boolean } = {}) {
  const organization = {
    "@type": "Organization",
    "@id": ORG_ID,
    name: "Revetly",
    legalName: "Revetly e.U.",
    url: SITE_URL,
    logo: absoluteUrl("/icon-512.png"),
    email: "hallo@revetly.ai",
    areaServed: ["AT", "DE", "CH"],
  }

  const website = {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: "Revetly",
    inLanguage: "de",
    publisher: { "@id": ORG_ID },
  }

  if (minimal) return { "@context": "https://schema.org", "@graph": [organization, website] }

  const software = {
    "@type": "SoftwareApplication",
    "@id": `${SITE_URL}/#software`,
    name: "Revetly",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Recruiting-Software",
    operatingSystem: "Web",
    url: SITE_URL,
    inLanguage: "de",
    description:
      "KI-Recruiting-Software für den DACH-Raum: Bewerbungen sammeln, Passung mit Beleg prüfen, Gespräche planen, Absagen schreiben. Die Entscheidung trifft der Mensch.",
    publisher: { "@id": ORG_ID },
    offers: [
      {
        "@type": "Offer",
        name: `${PLANS.free.label}: ${PLANS.free.matches_label}`,
        price: 0,
        priceCurrency: "EUR",
      },
      ...PAID.map((id) => ({
        "@type": "Offer",
        name: PLANS[id].label,
        price: PLANS[id].price_monthly,
        priceCurrency: "EUR",
        // Nettopreise, monatlich.
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: PLANS[id].price_monthly,
          priceCurrency: "EUR",
          unitText: "Monat",
          valueAddedTaxIncluded: false,
        },
      })),
    ],
  }

  const faq = {
    "@type": "FAQPage",
    "@id": `${SITE_URL}/#faq`,
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  }

  return { "@context": "https://schema.org", "@graph": [organization, website, software, faq] }
}
