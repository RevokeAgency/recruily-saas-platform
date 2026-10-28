// ─────────────────────────────────────────────────────────────────────────────
// Sicherheits-Header (SEO-Audit 28.10.2026). Nur in Produktion: Der
// Entwicklungsserver braucht eval und eigene Websocket-Verbindungen.
//
// CSP ohne Nonce, deshalb 'unsafe-inline' für Skripte: Next.js setzt eigene
// Inline-Skripte. Externe Quellen sind nur Supabase (Daten, Anmeldung,
// Firmenlogos, Bewerberfotos) und Vercel (Analyse, Vorschau-Werkzeugleiste).
// Stripe, Google und Microsoft werden nur angesprungen, nicht eingebettet.
// ─────────────────────────────────────────────────────────────────────────────
const supabaseOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin
  } catch {
    return ""
  }
})()
const supabaseWs = supabaseOrigin.replace(/^https:/, "wss:")

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com https://vercel.live",
  "style-src 'self' 'unsafe-inline' https://vercel.live",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://vercel.live https://assets.vercel.com",
  `connect-src 'self' ${supabaseOrigin} ${supabaseWs} https://va.vercel-scripts.com https://vitals.vercel-insights.com https://vercel.live wss://ws-us3.pusher.com`,
  "frame-src 'self' https://vercel.live",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
]
  .map((d) => d.replace(/\s+/g, " ").trim())
  .join("; ")

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
]

// Crawler, die Titel, Beschreibung und Canonical direkt im <head> bekommen
// statt nachgestreamt. Die Standardliste von Next.js (Google, Bing, Social,
// Lighthouse) plus KI-Crawler, die kein JavaScript ausführen.
const htmlLimitedBots =
  /[\w-]+-Google|Google-[\w-]+|Googlebot|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight|GPTBot|ChatGPT-User|OAI-SearchBot|ClaudeBot|Claude-User|Claude-SearchBot|anthropic-ai|PerplexityBot|Perplexity-User|CCBot|Amazonbot|cohere-ai|Meta-ExternalAgent|MistralAI-User|Bytespider/i

/** @type {import('next').NextConfig} */
const nextConfig = {
  htmlLimitedBots,
  async headers() {
    if (process.env.NODE_ENV !== "production") return []
    return [{ source: "/:path*", headers: securityHeaders }]
  },
  // Typfehler brechen den Build ab. Früher stand hier ignoreBuildErrors: true,
  // Fehler landeten so ungebremst in Produktion. Geprüft wird zusätzlich in
  // der GitHub-Action (.github/workflows/ci.yml).
  images: {
    unoptimized: true,
  },
  // Keep the native/heavy CV-photo deps out of the bundler; load them at runtime.
  // The pdfjs worker is pulled into the bundle via a require.resolve() literal in
  // lib/cv-photo.ts (outputFileTracingIncludes reproducibly crashes the Vercel
  // build here, so we can't use it).
  // @react-pdf/renderer bringt eigene React-Reconciler und Schriftlogik mit und
  // läuft zuverlässig nur ungebündelt (Revetly Report, lib/report).
  serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist", "@react-pdf/renderer"],
}

export default nextConfig
