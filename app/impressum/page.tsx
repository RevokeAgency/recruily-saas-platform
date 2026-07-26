import type { Metadata } from "next"
import { LegalPage, LegalSection } from "@/components/legal/legal-page"

export const metadata: Metadata = {
  title: "Impressum — Revetly",
  description: "Impressum und Offenlegung gemäß §5 ECG, §14 UGB und §25 MedienG.",
}

// Austrian Impressum / Offenlegung (§5 ECG, §14 UGB, §25 MedienG).
// NOTE: fill in every [Platzhalter] and have it reviewed by legal counsel.
export default function ImpressumPage() {
  return (
    <LegalPage title="Impressum" intro="Offenlegung gemäß §5 ECG, §14 UGB und §25 MedienG.">
      <LegalSection title="Medieninhaber & Diensteanbieter">
        <p className="whitespace-pre-line">
          {`Revetly e.U.
Inhaber: [Vor- und Nachname]
[Straße und Hausnummer]
[PLZ] [Ort], Österreich`}
        </p>
      </LegalSection>

      <LegalSection title="Kontakt">
        <p className="whitespace-pre-line">
          {`E-Mail: [kontakt@revetly.ai]
Telefon: [+43 …]`}
        </p>
      </LegalSection>

      <LegalSection title="Unternehmensdaten">
        <ul className="list-none space-y-1">
          <li>Unternehmensgegenstand: [z. B. Softwareentwicklung / IT-Dienstleistungen]</li>
          <li>Firmenbuchnummer: [FN …]</li>
          <li>Firmenbuchgericht: [z. B. Landesgericht …]</li>
          <li>UID-Nummer: [ATU…]</li>
          <li>Gewerbebehörde: [Bezirkshauptmannschaft / Magistrat …]</li>
        </ul>
      </LegalSection>

      <LegalSection title="Kammerzugehörigkeit & Berufsrecht">
        <p>
          Mitglied der Wirtschaftskammer [Bundesland], Fachgruppe [z. B. Unternehmensberatung,
          Buchhaltung und Informationstechnologie]. Anwendbare Rechtsvorschrift: Gewerbeordnung
          (GewO), abrufbar unter{" "}
          <a
            href="https://www.ris.bka.gv.at"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[var(--rv-green-deep)] underline"
          >
            ris.bka.gv.at
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Online-Streitbeilegung">
        <p>
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
          <a
            href="https://ec.europa.eu/consumers/odr"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[var(--rv-green-deep)] underline"
          >
            ec.europa.eu/consumers/odr
          </a>
          . Zur Teilnahme an einem Streitbeilegungsverfahren vor einer Verbraucher­schlichtungs­stelle
          sind wir nicht verpflichtet und grundsätzlich nicht bereit.
        </p>
      </LegalSection>

      <LegalSection title="Haftung für Inhalte & Links">
        <p>
          Die Inhalte dieser Website wurden mit größter Sorgfalt erstellt. Für die Richtigkeit,
          Vollständigkeit und Aktualität wird jedoch keine Gewähr übernommen. Für Inhalte externer
          Links, auf die wir verweisen, sind ausschließlich deren Betreiber verantwortlich.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
