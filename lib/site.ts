/**
 * Basis-URL der öffentlichen Seite.
 *
 * Wird für absolute Links in Metadaten, Sitemap und robots.txt gebraucht.
 * Reihenfolge: explizit gesetzte Variable, dann die von Vercel gemeldete
 * Produktionsdomain, sonst die Zieldomain. Beim Domain-Wechsel reicht es,
 * NEXT_PUBLIC_SITE_URL zu setzen.
 */
export const SITE_URL: string = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "") ||
  "https://revetly.ai"
).replace(/\/+$/, "")

export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`
}
