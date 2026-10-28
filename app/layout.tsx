import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { SITE_URL } from '@/lib/site'

// Self-hosted, no Google-Fonts hotlink (DSGVO). Latin subset covers German
// (äöüß live in Latin-1 Supplement); latin-ext is not wired since it only
// adds Central/Eastern-European diacritics outside the DACH target market.
const plusJakartaSans = localFont({
  src: [
    { path: './fonts/pjs-normal-latin.woff2', weight: '400 800', style: 'normal' },
    { path: './fonts/pjs-italic-latin.woff2', weight: '400 800', style: 'italic' },
  ],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
})

// Titel bewusst mit dem Suchbegriff vorn und der Marke hinten: Danach sucht
// jemand, der das Produkt noch nicht kennt.
const title = 'KI-Recruiting-Software für den DACH-Raum | Revetly'
const description =
  'Revetly übernimmt alles zwischen Stellenanzeige und Zusage: Bewerbungen sammeln, Passung prüfen, Gespräche planen. Die Entscheidung triffst du. Verarbeitung in der EU.'

export const metadata: Metadata = {
  // Basis für relative canonical-/OG-URLs (z. B. der Blog-Beiträge).
  metadataBase: new URL(SITE_URL),
  title,
  description,
  generator: 'v0.app',
  // Revetly-Favicon (Quelle: Supabase-Speicher Revetly/Favicon.png), in
  // public/ in den Größen, die Browser und Startbildschirme abfragen.
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
      { url: '/icon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: { url: '/apple-icon.png', sizes: '180x180' },
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    siteName: 'Revetly',
    title,
    description,
    images: [{ url: '/revetly/og-image.jpg', width: 1200, height: 630 }],
    locale: 'de_DE',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/revetly/og-image.jpg'],
  },
}

// Kein maximumScale: Eine Zoomsperre verhindert, dass sehbehinderte Nutzer
// die Seite vergrößern (WCAG 1.4.4), und bringt auf aktuellen Browsern
// ohnehin nichts mehr gegen versehentliches Zoomen.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#16C77C',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="de"
      className={`${plusJakartaSans.variable} bg-background`}
    >
      <body className="font-sans antialiased">
        {/* Das Hero-Bild liegt seit dem SEO-Audit lokal. Aus dem Supabase-Bucket
            kommen noch Firmenlogos und Bewerberfotos, dafür reicht die
            DNS-Vorabfrage. React hebt den Link selbsttätig in den head. */}
        <link rel="dns-prefetch" href="https://wciddwedyrgwjsppzlfr.supabase.co" />
        {children}
        <Toaster position="bottom-right" />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
