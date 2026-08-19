# Product Marketing Context: Revetly

Grundlagendokument für alle Marketing-Skills. Wird vor jeder Copy-, SEO- oder
CRO-Aufgabe gelesen, damit Produkt, Zielgruppe und Positionierung nicht in
jeder Session neu erklärt werden müssen.

Stand: August 2026. Vorbereitung Go-Live, noch keine zahlenden Kunden.

## Produkt

Revetly ist eine KI-gestützte Recruiting-Software für den DACH-Raum. Sie
bewertet eingehende Bewerbungen gegen eine konkrete Stelle, sortiert sie zu
einer begründeten Rangfolge und lässt Kandidaten ihren Gesprächstermin selbst
buchen.

Kern ist die **Revetly Match Analyse** (intern: IMLRS 2.0). Sie läuft in vier
Stufen:

1. Aus dem vollständigen Lebenslauf entsteht ein Kurzdossier.
2. Deterministische Prüfung, welche geforderten Fähigkeiten tatsächlich gedeckt
   sind (Hard Facts).
3. Ein Modell bewertet neun Ebenen und muss zu jeder Zahl Begründung und Beleg
   aus den Unterlagen liefern (Judge).
4. Ein zweites Modell prüft jede Kategorie gegen Rubrik und Belege und
   korrigiert (Verifier). Beide Urteile bleiben im Protokoll sichtbar.

Die neun Ebenen: Hard Skills, Berufserfahrung, Ausbildung, Soft Skills,
Sprachen, Standort, Branche, Gehaltsvorstellung, Kultur-Fit.

**Qualifikationssperre:** Fehlt eine geforderte Berufszulassung (Diplom,
Nostrifikation, Zertifikat), deckelt Revetly den Gesamtscore. Fehlende
Zulassung lässt sich nicht durch gute Sprachkenntnisse oder Kultur-Fit
wegrechnen. Das war ein ausdrücklicher Kundenwunsch, entstanden am Beispiel
einer Bürokraft ohne Pflegeausbildung, die auf eine Pflegestelle 28 Prozent
erreichte.

Weitere Funktionen: Stellenanzeige per Link auslesen, öffentliche
Bewerbungsseite, Bewerbung per E-Mail an die Stellenadresse, Lebenslauf-Parsing
auch aus gescannten PDFs, K.O.-Kriterien pro Stelle, Talent-Pool-Abgleich neuer
Stellen gegen bestehende Kandidaten, strukturierte Interviewleitfäden,
Terminbuchung mit Google Workspace und Microsoft 365, automatisierte Absagen.

## Zielgruppe

Drei Segmente, in dieser Reihenfolge:

**Personalberatung und Zeitarbeit.** Viele Stellen gleichzeitig, wenig Zeit pro
Bewerbung. Größter Hebel ist der Talent-Pool-Abgleich: bestehende Kandidaten
gegen neue Mandate matchen, statt neu zu akquirieren.

**KMU ohne eigene HR-Abteilung.** Die Geschäftsführung oder das Büro sortiert
nebenbei mit. Größter Hebel ist, dass Absagen und Terminvereinbarung ohne
manuelle Arbeit laufen.

**Reglementierte Berufe** (Pflege, Technik, Handwerk). Ohne Zulassung nützt der
beste Lebenslauf nichts. Größter Hebel ist die Qualifikationssperre.

Gemeinsam ist allen: Sie besetzen selbst, haben kein Bewerbermanagementsystem
im Einsatz und misstrauen KI-Scores, die sich nicht erklären.

## Problem, das wir lösen

Bei jeder Ausschreibung stapeln sich Bewerbungen, die alle irgendwie passen
könnten. Weil die Zeit fehlt, entscheidet in der Praxis die Reihenfolge im
Posteingang statt der Eignung. Konkret:

- Nach der zehnten Bewerbung verschwimmen die Profile, sortiert wird nach
  Gefühl. Warum jemand aussortiert wurde, lässt sich hinterher nicht sagen.
- Absagen bleiben liegen, weil sie Zeit kosten und niemandem Spaß machen.
  Kandidaten warten wochenlang.
- Bis ein Termin steht, sind mehrere E-Mails hin und her gegangen.

## Positionierung

**Kategorie:** KI-Recruiting-Software / Bewerbervorauswahl.

**Differenzierung, in dieser Reihenfolge:**

1. **Nachvollziehbarkeit.** Jede Zahl kommt mit Begründung und der Textstelle
   aus den Unterlagen, auf die sie sich stützt. Das ist das eigentliche
   Verkaufsargument gegenüber Blackbox-Scores, und es ist mit Blick auf den
   EU AI Act auch die haltbarere Position.
2. **Zweite Prüfinstanz.** Kein Score erreicht den Kunden, ohne dass ein
   unabhängiges zweites Modell ihn gegengeprüft hat.
3. **Qualifikation als harte Grenze**, nicht als Punktabzug.
4. **EU-Datenhoheit.** Speicherung und Auswertung ausschließlich in der EU,
   kein Training auf Bewerberdaten, automatische Löschung nach 180 Tagen,
   Selbstlöschung durch Bewerber möglich.

**Wogegen wir positionieren:** klassische Bewerbermanagementsysteme (zu schwer,
zu teuer, keine Bewertung), Schlagwortsuche in Lebensläufen (zu grob),
manuelles Sortieren (der eigentliche Status quo bei unserer Zielgruppe).

## Ton und Sprache

Deutsch, Du-Ansprache. Professionell, direkt, ohne Agenturfloskeln. Der Leser
ist Praktiker und riecht Marketing-Sprech sofort.

**Feste Terminologie:** "Revetly Match Analyse" (nie IMLRS nach außen),
"Bewertung" (nicht "Match", außer bei Kontingenten: "5 Bewertungen pro Monat"),
"Bewerber" und "Kandidat" synonym, "Stelle" (nicht "Job" in Fließtext).

**Verboten:**

- **Erfundene Fakten jeder Art.** Keine Kundenstimmen, Logos, Fallzahlen,
  Zeitersparnis-Prozente oder "X Unternehmen nutzen Revetly", solange es keine
  echten gibt. Das ist kein Stilproblem: erfundene Referenzen und Werbeaussagen
  sind in Österreich und der EU unlautere Werbung (UWG-Anhang, Richtlinie
  2005/29/EG).
- **Namen von Unterauftragnehmern in der Werbung.** Welches KI-Modell und
  welcher Mailversender dahinterstecken, gehört in die Datenschutzerklärung
  (Art. 13 DSGVO), nicht auf die Landing Page. Ausdrückliche Kundenvorgabe.
- **Gedankenstriche** (— und –) im Fließtext.
- **Ausrufezeichen** in Marketing-Copy.

**Freie Zahlen, die belegbar sind:** 9 Bewertungsebenen, 2 Prüfinstanzen,
180 Tage bis zur Löschung, Kontingente laut `lib/plans.ts`.

## Angebot

Free (0 €): 1 aktive Stelle, 5 Bewertungen pro Monat, keine Kreditkarte.
Starter 99 €, Growth 249 €, Pro 499 €, Enterprise auf Anfrage. Jährlich zwei
Monate gratis. Monatlich kündbar über das Stripe-Portal.

Freitier-Zahlen niemals hart in Copy schreiben, immer aus `PLANS.free.matches`
ableiten, sonst laufen Landing und Abrechnung auseinander.

## Primäre Conversion

Registrierung für den kostenlosen Plan. Ein primärer Call-to-Action, im Hero
und im Abschluss wiederholt. Sekundäre Aktionen (Beispiel ansehen, Ablauf
lesen) bleiben optisch nachgeordnet.
