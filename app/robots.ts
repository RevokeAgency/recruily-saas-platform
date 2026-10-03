import type { MetadataRoute } from "next"

import { absoluteUrl } from "@/lib/site"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Anwendungsbereich und Bewerbungsformulare gehören nicht in den Index.
      // Persönliche Buchungslinks (/termin/...) gehören ebenfalls nicht in den Index.
      // Freigabe-Links für Fachabteilungen (/freigabe/...) ebenso.
      disallow: ["/api/", "/auth/", "/onboarding/", "/apply/", "/termin/", "/freigabe/"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  }
}
