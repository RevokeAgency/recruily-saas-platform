import type { Metadata } from "next"
import Link from "next/link"
import { LegalPage, LegalSection } from "@/components/legal/legal-page"

export const metadata: Metadata = {
  title: "AGB — Revetly",
  description: "Allgemeine Geschäftsbedingungen für die Nutzung der Revetly-Plattform.",
}

// General terms for the SaaS (primarily B2B), Austrian law.
// NOTE: fill in every [Platzhalter] and have it reviewed by legal counsel.
export default function AgbPage() {
  return (
    <LegalPage
      title="Allgemeine Geschäftsbedingungen"
      intro={`Diese AGB regeln die Nutzung der Revetly-Plattform zwischen der Revetly e.U. („Revetly", „wir") und ihren Kundinnen und Kunden („Kunde").`}
    >
      <LegalSection title="1. Geltungsbereich">
        <p>
          Diese AGB gelten für sämtliche Verträge über die Nutzung der von Revetly bereitgestellten
          Software-as-a-Service-Plattform. Abweichende Bedingungen des Kunden werden nicht
          Vertragsbestandteil, es sei denn, Revetly stimmt ihrer Geltung ausdrücklich schriftlich zu.
          Das Angebot richtet sich in erster Linie an Unternehmer im Sinne des UGB.
        </p>
      </LegalSection>

      <LegalSection title="2. Leistungsbeschreibung">
        <p>
          Revetly stellt eine cloudbasierte Recruiting-Plattform bereit, mit der Kunden Stellen
          ausschreiben, Bewerbungen entgegennehmen und mittels KI-gestützter Analyse bewerten können.
          Der konkrete Funktionsumfang richtet sich nach dem gewählten Tarif. Revetly entwickelt die
          Plattform laufend weiter und kann den Funktionsumfang anpassen, solange der Kernnutzen
          erhalten bleibt.
        </p>
      </LegalSection>

      <LegalSection title="3. Registrierung & Vertragsabschluss">
        <p>
          Der Vertrag kommt mit Abschluss der Registrierung bzw. der Buchung eines kostenpflichtigen
          Tarifs zustande. Der Kunde ist verpflichtet, wahrheitsgemäße Angaben zu machen und seine
          Zugangsdaten vertraulich zu behandeln.
        </p>
      </LegalSection>

      <LegalSection title="4. Preise, Abrechnung & Zahlung">
        <p>
          Es gelten die zum Zeitpunkt der Buchung auf der Website ausgewiesenen Preise. Alle Preise
          verstehen sich, sofern nicht anders angegeben, zzgl. der gesetzlichen Umsatzsteuer. Die
          Abrechnung erfolgt je nach gewähltem Tarif monatlich oder jährlich im Voraus über unseren
          Zahlungsdienstleister Stripe. Bei einem Wechsel in einen höherwertigen Tarif wird die
          Differenz anteilig sofort berechnet; ein Wechsel in einen niedrigeren Tarif wird zum Ende
          der laufenden Abrechnungsperiode wirksam.
        </p>
      </LegalSection>

      <LegalSection title="5. Laufzeit & Kündigung">
        <p>
          Der Vertrag läuft je nach Tarif für einen Monat bzw. ein Jahr und verlängert sich
          automatisch um denselben Zeitraum, sofern er nicht bis zum Ende der jeweiligen Laufzeit
          gekündigt wird. Die Kündigung ist jederzeit über die Abo-Verwaltung (Kundenportal) zum
          Ende der laufenden Periode möglich. Das Recht zur außerordentlichen Kündigung aus wichtigem
          Grund bleibt unberührt.
        </p>
      </LegalSection>

      <LegalSection title="6. Pflichten des Kunden">
        <p>
          Der Kunde stellt sicher, dass er zur Verarbeitung der von ihm hochgeladenen bzw. über die
          Plattform empfangenen personenbezogenen Daten (insbesondere Bewerberdaten) berechtigt ist.
          Hinsichtlich dieser Daten ist der Kunde datenschutzrechtlich Verantwortlicher und Revetly
          Auftragsverarbeiter; es gilt die separate Vereinbarung zur Auftragsverarbeitung (AVV). Der
          Kunde verpflichtet sich, keine rechtswidrigen, rechteverletzenden oder schädlichen Inhalte
          hochzuladen.
        </p>
      </LegalSection>

      <LegalSection title="7. Verfügbarkeit & Support">
        <p>
          Revetly bemüht sich um eine hohe Verfügbarkeit der Plattform, schuldet jedoch keine
          ununterbrochene Verfügbarkeit. Wartungsarbeiten sowie Störungen außerhalb des
          Einflussbereichs von Revetly können zu vorübergehenden Einschränkungen führen. Der
          Support-Umfang richtet sich nach dem gewählten Tarif.
        </p>
      </LegalSection>

      <LegalSection title="8. Gewährleistung & Haftung">
        <p>
          Revetly haftet nach den gesetzlichen Bestimmungen für Vorsatz und grobe Fahrlässigkeit. Für
          leichte Fahrlässigkeit haftet Revetly nur bei Verletzung wesentlicher Vertragspflichten und
          der Höhe nach begrenzt auf den vertragstypischen, vorhersehbaren Schaden. Die Haftung für
          entgangenen Gewinn und Folgeschäden ist im gesetzlich zulässigen Rahmen ausgeschlossen. Die
          KI-gestützte Bewertung stellt eine Entscheidungsunterstützung dar; die Auswahlentscheidung
          trifft ausschließlich der Kunde.
        </p>
      </LegalSection>

      <LegalSection title="9. Datenschutz">
        <p>
          Informationen zur Verarbeitung personenbezogener Daten finden sich in unserer{" "}
          <Link href="/datenschutz" className="font-medium text-[var(--rv-green-deep)] underline">
            Datenschutzerklärung
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="10. Änderungen der AGB">
        <p>
          Revetly kann diese AGB mit Wirkung für die Zukunft ändern. Über Änderungen wird der Kunde in
          angemessener Frist vor Inkrafttreten informiert. Widerspricht der Kunde nicht innerhalb der
          mitgeteilten Frist bzw. nutzt er die Plattform weiter, gelten die geänderten AGB als
          angenommen.
        </p>
      </LegalSection>

      <LegalSection title="11. Schlussbestimmungen">
        <p>
          Es gilt österreichisches Recht unter Ausschluss des UN-Kaufrechts und der
          Verweisungsnormen des internationalen Privatrechts. Ausschließlicher Gerichtsstand für
          Streitigkeiten mit Unternehmern ist [Ort], soweit gesetzlich zulässig. Sollte eine
          Bestimmung dieser AGB unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen
          unberührt.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
