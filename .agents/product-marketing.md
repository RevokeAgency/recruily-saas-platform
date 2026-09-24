# Product Marketing Context: Revetly

Grundlagendokument für alle Marketing-Skills. Wird vor jeder Copy-, SEO- oder
CRO-Aufgabe gelesen, damit Produkt, Zielgruppe und Positionierung nicht in
jeder Session neu erklärt werden müssen.

Stand: September 2026, **Positionierung v2**. Vorbereitung Go-Live, noch
keine zahlenden Kunden. Maßgeblich ist der Auftrag „Landing Page auf
Positionierung v2 umbauen"; wo ältere Notizen abweichen, gilt v2.

## Kernaussage

**Revetly übernimmt alles zwischen Stellenanzeige und Zusage: Bewerbungen
sammeln, Passung prüfen, Gespräche planen und strukturiert führen. Die
Entscheidung triffst du.**

Oberzeile: KI-Recruiting-Assistent für den DACH-Raum.
Hero: „Von 100 Bewerbungen zur richtigen Einstellung." Die 100 ist ein Bild
für den Stapel, keine Leistungszahl.
Markenzeile: „Lies die Shortlist, nicht den Stapel."

Drei Versprechen, in dieser Reihenfolge:

1. **Der ganze Weg in einem System**, von der Anzeige bis zur Zusage.
2. **Jeder Match belegt.** Zu jeder Zahl steht die Stelle aus den Unterlagen.
3. **Die Entscheidung bleibt beim Menschen.** Revetly sortiert und
   organisiert, eingestellt wird, wen du auswählst. Danach übernimmt dein
   HR-System; Revetly ersetzt es nicht.

## Produkt, wie es die Seite beschreibt

Jede Aussage hier ist im Produkt gedeckt. Wer eine davon ändert, prüft sie
gegen den Code.

**Ablauf in fünf Schritten**
1. Stelle anlegen: Link der Stellenanzeige einfügen, Revetly liest Aufgaben
   und Anforderungen heraus. Pflichtanforderungen als K.O.-Kriterium.
2. Bewerbungen sammeln: eigene Bewerbungsseite, E-Mail an die
   Stellenadresse, Upload, auch gescannte PDFs.
3. Shortlist lesen: Rangfolge, zu jedem Kandidaten der Grund.
4. Gespräche führen: Bewerber buchen selbst einen Termin (Google- oder
   Microsoft-Kalender), dazu ein Leitfaden, der an den offenen Punkten des
   Lebenslaufs ansetzt.
5. Entscheiden: Du triffst die Wahl, Revetly schließt die Stelle ab und
   verschickt die Absagen. Die eingestellte Person überträgst du in dein
   HR-System.

**Revetly Match Analyse** (intern IMLRS 2.0, nach außen nie so nennen)
- Neun Ebenen einzeln geprüft und begründet: Hard Skills, Berufserfahrung,
  Ausbildung, Soft Skills, Sprachen, Standort, Branche, Gehaltsvorstellung,
  Kultur-Fit.
- Zweite Prüfinstanz: ein unabhängiges zweites Modell prüft nach, beide
  Urteile bleiben sichtbar.
- Qualifikationssperre: Fehlt eine geforderte Zulassung (Pflegediplom,
  Nostrifikation), bleibt der Score gedeckelt. Entstanden am Beispiel einer
  Bürokraft ohne Pflegeausbildung, die auf eine Pflegestelle 28 Prozent
  erreichte.

**Das Gespräch zählt mit.** Pro Antwort 1 bis 5 Punkte, das Ergebnis fließt
in den Match ein (40 Prozent Gespräch, 60 Prozent Analyse). Die
Qualifikationssperre und K.O.-Kriterien lassen sich durch ein gutes Gespräch
nicht wegrechnen.

**Der Rest läuft nebenher.** Absagen persönlich formuliert auf Knopfdruck, in
allen Plänen. Terminbuchung durch den Bewerber. Talent-Pool: neue Stellen
gegen frühere Bewerber.

**Datenschutz.** Verarbeitung ausschließlich in der EU. Löschung nach 180
Tagen, Bewerber können sie selbst anstoßen. Revetly lernt aus
Einstellungsentscheidungen **nur für das eigene Konto und nur mit
ausdrücklicher Zustimmung**; ein gemeinsames Modell über Kunden hinweg wird
nicht trainiert.

## Zielgruppen

Geschnitten nach dem Stapel pro Stelle, nicht nach Unternehmensgröße. In
dieser Reihenfolge:

1. **Personaldienstleister und Recruiter.** Viele Mandate, jede Woche neue
   Stellen. Hebel: Talent-Pool-Abgleich, bevor neu gesucht wird.
2. **Unternehmen mit vielen offenen Stellen.** Eigene Bewerbungsseite und
   eigenes Ranking pro Stelle, Überblick auch bei zwanzig parallelen Stellen.
3. **Betriebe mit einer Stelle und vollem Posteingang.** Eine Anzeige,
   sechzig Bewerbungen, keine Personalabteilung.

Die Qualifikationssperre bleibt ein starkes Argument für reglementierte
Berufe (Pflege, Technik, Handwerk), ist aber kein eigenes Segment mehr.

## Angebot

Probestelle (Free): 1 Stelle, 25 Matches, **einmalig**, ohne Kreditkarte.
Eine Probestelle pro Firmendomain, nur mit Firmen-E-Mail.
Starter 99 €, Growth 249 €, Pro 499 €, Enterprise auf Anfrage. Monatlich
kündbar, jährlich zwei Monate gratis.

Kontingentzahlen **nie** hart in die Copy schreiben, immer aus `PLANS` in
`lib/plans.ts` ableiten.

Primäre Conversion: „Erste Stelle kostenlos testen" → `/auth/register`.
Mikrotext darunter: `{PLANS.free.matches} Matches gratis · keine Kreditkarte`.

## Harte Regeln für jeden Text auf der Landing Page

1. **Keine Gedankenstriche** im Fließtext (weder – noch —). Stattdessen
   Punkt, Komma, Doppelpunkt.
2. **Keine Ausrufezeichen.**
3. **„Bewertung" und „bewerten" in allen Formen kommen nicht vor.**
   Stattdessen: Match, Passung, prüfen, Ranking. Rechtstexte und Dashboard
   sind ausgenommen.
4. **Keine KI-, Mail- oder Zahlungsanbieter namentlich** (kein Mistral,
   Lettermint, Resend, Stripe). Google- und Microsoft-Kalender dürfen genannt
   werden. In Datenschutzerklärung und AVV-Liste selbstverständlich schon.
5. **Keine Zeitversprechen** in Sekunden oder Minuten („sofort",
   „ab Sekunde 1", „3 min"). Eine vollständige Analyse dauert rund 60 Sekunden.
6. **Nichts erfinden:** keine Nutzerzahlen, keine Testimonials, kein
   „Am beliebtesten". Erfundene Referenzen sind in Österreich und der EU
   unlautere Werbung (UWG-Anhang, Richtlinie 2005/29/EG).
7. **Du-Ansprache durchgehend**, auch in Blog-Teasern auf der Startseite.
   Die Artikel selbst siezen; die Startseite nutzt dafür das Feld `teaser`.
8. **Kontingentzahlen** aus `PLANS`.

Designsystem unverändert: Tokens aus `app/globals.css`, Präfix `rv-`,
Einblendungen über `useReveal()` und die Klasse `reveal`.

## Ton

Deutsch, Du. Professionell, direkt, ohne Agenturfloskeln. Der Leser ist
Praktiker und riecht Marketing-Sprech sofort. Kurze Sätze, konkrete Beispiele,
keine Superlative ohne Beleg.

**Feste Begriffe:** „Revetly Match Analyse" (nie IMLRS nach außen), „Match"
für die Einschätzung pro Kandidat, „Passung", „Ranking" für die Rangfolge,
„Probestelle" für den kostenlosen Plan, „Bewerbungsseite" (nicht
„Apply-Link"), „Stelle" (nicht „Job" im Fließtext), „Bewerber" und
„Kandidat" synonym.
