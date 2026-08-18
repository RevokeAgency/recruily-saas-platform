import Link from "next/link"
import Image from "next/image"
import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Datenschutz — Revetly",
  description: "Datenschutzhinweise zur Verarbeitung personenbezogener Daten bei Revetly.",
}

// Public privacy notice. Plain, readable, EU-focused. NOTE: this is a solid
// starting template — have it reviewed by legal counsel before go-live and fill
// in the bracketed company/contact details.
export default function DatenschutzPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-16">
      <article className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center" aria-label="Zur Startseite">
            <Image
              src="/revetly/LogoEntwurf-trim.png"
              alt="Revetly"
              width={116}
              height={28}
              className="h-7 w-auto"
              priority
            />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--app-line)] bg-white px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zur Startseite
          </Link>
        </div>
        <h1 className="mt-8 text-[2rem] font-bold leading-tight tracking-tight text-foreground">
          Datenschutzerklärung
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Stand: {new Date().getFullYear()}</p>

        <div className="mt-8 space-y-8 text-[0.95rem] leading-relaxed text-[var(--rv-ink-soft)]">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">1. Verantwortlichkeit</h2>
            <p>
              Revetly stellt eine Recruiting-Plattform bereit, über die Unternehmen
              (nachfolgend „Kunden") Stellen ausschreiben und Bewerbungen verwalten.
              Für die Verarbeitung der Bewerberdaten im Rahmen eines konkreten
              Bewerbungsprozesses ist das jeweilige <strong>Kundenunternehmen</strong> der
              datenschutzrechtlich Verantwortliche; Revetly handelt insoweit als
              Auftragsverarbeiter. Für den Betrieb der Plattform selbst ist Revetly
              verantwortlich.
            </p>
            <p className="mt-2">
              Verantwortlicher für die Plattform: [Firmenname, Anschrift, E-Mail].
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">2. Welche Daten wir verarbeiten</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Kontaktdaten (Name, E-Mail, Telefon, Ort)</li>
              <li>Bewerbungsunterlagen (Lebenslauf, Anschreiben) inkl. der darin enthaltenen Angaben und ggf. eines Bewerbungsfotos</li>
              <li>Aus den Unterlagen automatisiert extrahierte Angaben (Qualifikationen, Erfahrung, Skills) sowie ein KI-gestützter Match-Score</li>
              <li>Bei registrierten Kunden: Konto- und Abrechnungsdaten</li>
              <li>
                Bei Terminbuchungen: gewählter Zeitpunkt sowie die vom Bewerber freiwillig
                angegebene Telefonnummer und Nachricht. Verbindet ein Kunde seinen Google- oder
                Microsoft-Kalender, fragt Revetly dort ausschließlich ab, wann er belegt ist
                (Zeitspannen ohne Inhalte), und trägt gebuchte Termine ein. Google Ireland Ltd.
                bzw. Microsoft Ireland Operations Ltd. sind insoweit Auftragsverarbeiter des
                Kunden; ohne verbundenen Kalender findet diese Übermittlung nicht statt.
              </li>
              <li>
                Bei registrierten Kunden: freiwillig abgegebene Rückmeldungen zum Produkt
                (Bewertung und Freitext), verarbeitet zur Weiterentwicklung von Revetly auf
                Grundlage unseres berechtigten Interesses (Art. 6 Abs. 1 lit. f DSGVO).
                Bitte gib in den Freitextfeldern keine Bewerberdaten an.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">3. Zwecke und Rechtsgrundlagen</h2>
            <p>
              Bewerberdaten werden zur Durchführung des Bewerbungsverfahrens verarbeitet
              (Art. 6 Abs. 1 lit. b bzw. lit. f DSGVO, § 26 BDSG). Die Bewerbung erfolgt
              auf Grundlage deiner Einwilligung (Art. 6 Abs. 1 lit. a DSGVO), die du
              jederzeit mit Wirkung für die Zukunft widerrufen kannst.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">4. Hosting & Auftragsverarbeiter</h2>
            <p>
              Die Plattform wird in der EU betrieben; die Datenbank und Dateien werden auf
              Servern innerhalb der EU (Frankfurt, Deutschland) gespeichert. Wir setzen
              sorgfältig ausgewählte Auftragsverarbeiter ein, u. a. für Hosting/Datenbank,
              E-Mail-Versand, KI-gestützte Auswertung der Unterlagen und
              Zahlungsabwicklung. Mit diesen bestehen Verträge zur Auftragsverarbeitung.
            </p>
            <p className="mt-2">
              Der <strong>E-Mail-Versand erfolgt über Lettermint (Europa)</strong>.
            </p>
            <p className="mt-2">
              Die <strong>KI-gestützte Auswertung erfolgt bei Mistral AI (Frankreich)</strong> und
              damit innerhalb der EU. Bewerbungsunterlagen werden ausschließlich zur Erstellung
              der Analyse verarbeitet und dort nicht zum Training fremder Modelle verwendet.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">5. Verbesserung unseres KI-Modells</h2>
            <p>
              Kundinnen und Kunden können in ihren Kontoeinstellungen freiwillig einwilligen, dass
              ihre eigenen Auswahlentscheidungen (z. B. Interview-Bewertungen) zur Verbesserung
              unseres Matching-Modells genutzt werden (Art. 6 Abs. 1 lit. a DSGVO). Diese
              Einwilligung ist <strong>standardmäßig deaktiviert</strong> und jederzeit mit Wirkung
              für die Zukunft widerrufbar; ein Widerruf löscht die bereits gespeicherten
              Trainingsdaten des Kontos.
            </p>
            <p className="mt-2">
              Vor der Speicherung werden die Daten <strong>pseudonymisiert</strong>: Namen,
              Kontaktdaten, Anschriften, Geburtsdaten und Arbeitgeberbezeichnungen werden durch
              Platzhalter ersetzt. Es werden keine vollständigen Lebensläufe und keine
              Bewerbungsfotos für das Training gespeichert. Die Verarbeitung findet in der EU statt.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">6. Speicherdauer</h2>
            <p>
              Bewerberdaten werden nur so lange gespeichert, wie es für den
              Bewerbungsprozess erforderlich ist, und spätestens <strong>6 Monate</strong>{" "}
              nach Abschluss des Verfahrens automatisch gelöscht — sofern keine längere
              Aufbewahrung gesetzlich vorgeschrieben oder durch ein laufendes Verfahren
              begründet ist. Du kannst deine Löschung jederzeit selbst veranlassen.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">7. Deine Rechte</h2>
            <p>
              Dir stehen die Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung
              der Verarbeitung, Datenübertragbarkeit und Widerspruch zu. Außerdem hast du
              ein Beschwerderecht bei einer Aufsichtsbehörde.
            </p>
            <div className="mt-4 rounded-2xl border border-[var(--app-line)] bg-white p-5">
              <p className="font-medium text-foreground">Daten selbst löschen</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Du kannst die Löschung deiner Bewerberdaten jederzeit selbst anstoßen — wir
                senden dir zur Bestätigung eine E-Mail.
              </p>
              <Link
                href="/datenschutz/loeschung"
                className="mt-3 inline-flex h-10 items-center rounded-full bg-[var(--rv-ink)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#1a2b26]"
              >
                Meine Daten löschen
              </Link>
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">8. Kontakt</h2>
            <p>
              Bei Fragen zum Datenschutz erreichst du uns unter [Datenschutz-Kontakt,
              E-Mail]. Für Bewerbungen bei einem bestimmten Unternehmen wende dich bitte
              zusätzlich direkt an das jeweilige Unternehmen als Verantwortlichen.
            </p>
          </section>
        </div>
      </article>
    </main>
  )
}
