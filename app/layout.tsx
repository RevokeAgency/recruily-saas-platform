import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

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

const title = 'Revetly — Die besten Kandidaten, sofort sichtbar'
const description =
  'Revetly ist KI-gestütztes Recruiting für den DACH-Markt. Matching, Absagen-Mails und Bewerberverwaltung – automatisiert, erklärbar, DSGVO-konform.'

export const metadata: Metadata = {
  title,
  description,
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
  openGraph: {
    type: 'website',
    siteName: 'Revetly',
    title,
    description:
      'KI-gestütztes Recruiting für den DACH-Markt. CV und Anschreiben gemeinsam analysiert, erklärbarer Score, DSGVO-konform auf EU-Servern.',
    images: [{ url: '/revetly/og-image.jpg', width: 1200, height: 630 }],
    locale: 'de_DE',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description: 'KI-gestütztes Recruiting für den DACH-Markt. Erklärbarer Score, DSGVO-konform auf EU-Servern.',
    images: ['/revetly/og-image.jpg'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
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
        {children}
        <Toaster position="bottom-right" />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
