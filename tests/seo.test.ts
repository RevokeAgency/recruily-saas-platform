import { describe, expect, it } from "vitest"

import { BLOG_POSTS } from "@/lib/blog/posts"
import { FAQS } from "@/lib/landing/faq"
import { PLANS } from "@/lib/plans"
import { BRAND_SUFFIX, TITLE_MAX, fitTitle, pageMetadata } from "@/lib/seo/page-metadata"
import { siteJsonLd } from "@/lib/seo/site-schema"

describe("Seitentitel", () => {
  it("nimmt den ersten Titel, der mit Marke in 60 Zeichen passt", () => {
    expect(fitTitle(["Key Account Manager (m/w/d) bei Allianz Gruppe in Österreich", "Key Account Manager (m/w/d)"]))
      .toBe("Key Account Manager (m/w/d) | Revetly")
    expect(fitTitle(["Kurz"])).toBe("Kurz | Revetly")
  })

  it("kürzt zu lange Titel an einer Wortgrenze", () => {
    const t = fitTitle(["Project Manager / Sales im Bereich High-Tech Materialprüfung (w/m/d)"])
    expect(t.length).toBeLessThanOrEqual(TITLE_MAX)
    expect(t.endsWith(`…${BRAND_SUFFIX}`)).toBe(true)
  })

  it("jeder Blogbeitrag hat einen Suchtitel bis 60 Zeichen", () => {
    for (const p of BLOG_POSTS) {
      expect(p.metaTitle, p.slug).toBeTruthy()
      expect(fitTitle([p.metaTitle!, p.title]), p.slug).toBe(`${p.metaTitle}${BRAND_SUFFIX}`)
    }
  })

  it("setzt Canonical, og:url und noindex vollständig", () => {
    const m = pageMetadata({ title: "Impressum | Revetly", description: "x", path: "/impressum", noindex: true })
    expect(m.alternates?.canonical).toBe("/impressum")
    expect((m.openGraph as { url?: string }).url).toBe("/impressum")
    expect(m.robots).toEqual({ index: false, follow: true })
  })
})

describe("Strukturierte Daten der Startseite", () => {
  const graph = siteJsonLd()["@graph"] as Array<Record<string, unknown>>
  const byType = (t: string) => graph.find((g) => g["@type"] === t)!

  it("enthält Organisation, Website, Software und FAQ", () => {
    expect(graph.map((g) => g["@type"])).toEqual(["Organization", "WebSite", "SoftwareApplication", "FAQPage"])
  })

  it("Preise kommen aus PLANS", () => {
    const offers = byType("SoftwareApplication").offers as Array<{ name: string; price: number }>
    for (const id of ["starter", "growth", "pro"] as const) {
      expect(offers.find((o) => o.name === PLANS[id].label)?.price).toBe(PLANS[id].price_monthly)
    }
  })

  it("FAQ entspricht den Fragen auf der Seite", () => {
    const qs = (byType("FAQPage").mainEntity as Array<{ name: string }>).map((q) => q.name)
    expect(qs).toEqual(FAQS.map((f) => f.q))
  })
})
