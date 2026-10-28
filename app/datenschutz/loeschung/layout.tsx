import type { Metadata } from "next"

import { pageMetadata } from "@/lib/seo/page-metadata"

// Eigener Titel statt dem der Startseite; ein Formular gehört nicht in den Index.
export const metadata: Metadata = pageMetadata({
  title: "Meine Daten löschen | Revetly",
  description: "Als Bewerberin oder Bewerber die Löschung deiner Daten bei Revetly selbst anstoßen.",
  path: "/datenschutz/loeschung",
  noindex: true,
})

export default function DeletionLayout({ children }: { children: React.ReactNode }) {
  return children
}
