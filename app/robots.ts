import type { MetadataRoute } from "next"

import { absoluteUrl } from "@/lib/site"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Anwendungsbereich und Bewerbungsformulare gehören nicht in den Index.
      disallow: ["/api/", "/auth/", "/onboarding/", "/apply/"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  }
}
