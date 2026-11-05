import type { Metadata } from "next"

import { ContactForm } from "@/components/contact/contact-form"
import { LegalPage, LegalSection } from "@/components/legal/legal-page"
import { isContactTopic } from "@/lib/contact"
import { pageMetadata } from "@/lib/seo/page-metadata"

export const metadata: Metadata = pageMetadata({
  title: "Kontakt | Revetly",
  description: "Schreib uns: Fragen zu Revetly, Angebote für größere Teams, Hilfe bei der Nutzung oder Datenschutz. Wir antworten per Mail.",
  path: "/kontakt",
})

const LINK = "font-medium text-[var(--rv-green-deep)] underline"

export default async function KontaktPage({
  searchParams,
}: {
  searchParams: Promise<{ thema?: string }>
}) {
  const { thema } = await searchParams
  return (
    <LegalPage
      title="Kontakt"
      intro="Du hast eine Frage zu Revetly, brauchst ein Angebot für dein Team oder Hilfe bei der Nutzung? Schreib uns, wir antworten per Mail."
      showDate={false}
    >
      <ContactForm defaultTopic={isContactTopic(thema) ? thema : "frage"} />

      <LegalSection title="Lieber direkt per Mail">
        <ul className="list-none space-y-1">
          <li>
            Allgemeine Anfragen:{" "}
            <a href="mailto:hallo@revetly.ai" className={LINK}>hallo@revetly.ai</a>
          </li>
          <li>
            Hilfe bei der Nutzung:{" "}
            <a href="mailto:support@revetly.ai" className={LINK}>support@revetly.ai</a>
          </li>
        </ul>
      </LegalSection>
    </LegalPage>
  )
}
