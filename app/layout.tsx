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

export const metadata: Metadata = {
  title: 'REVETLY — More time for what matters.',
  description:
    'REVETLY automates your entire recruiting pipeline — from the first application to the confirmed interview. AI reads, scores, and ranks every candidate so your team can focus on building relationships.',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#FFFFFF',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
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
