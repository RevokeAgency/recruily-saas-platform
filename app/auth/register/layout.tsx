import type { Metadata } from "next"

import { pageMetadata } from "@/lib/seo/page-metadata"

// Eigener Titel statt dem der Startseite. Nicht in den Index: Die Seite ist
// ein Formular ohne eigenen Inhalt, Varianten mit ?plan= wären Duplikate.
export const metadata: Metadata = pageMetadata({
  title: "Konto erstellen | Revetly",
  description: "Lege dein Revetly-Konto an und starte mit einer kostenlosen Probestelle.",
  path: "/auth/register",
  noindex: true,
})

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children
}
