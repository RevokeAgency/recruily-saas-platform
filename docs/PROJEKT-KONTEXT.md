# Revetly: vollständiger Projektkontext

Diese Datei ist als Wissensdokument für ein Claude Project gedacht. Sie soll eine
frische Session so weit bringen, dass sie ohne Rückfragen mitarbeiten kann:
Was das Produkt ist, wie es gebaut ist, welche Regeln gelten, was entschieden
wurde und warum, und was vor dem Launch noch offen ist.

Stand: 24. September 2026, **Positionierung v2**. Vor dem Go-Live, noch keine
zahlenden Kunden. Maßgeblich für alle Texte ist Positionierung v2; wo ältere
Notizen abweichen, gilt v2. Das Produkt ist so gebaut, dass es jede Aussage
der Landing Page deckt.

Ergänzende Dateien im Repo:
- `docs/GO-LIVE.md`: die operative Launch-Checkliste, Punkt für Punkt abhakbar
- `.agents/product-marketing.md`: Positionierung, Zielgruppensegmente, Tonalität

---

## 1 · Was Revetly ist

KI-Recruiting-Assistent für den DACH-Raum. Revetly übernimmt alles zwischen
Stellenanzeige und Zusage: Bewerbungen sammeln, Passung prüfen, Gespräche
planen und strukturiert führen. **Die Entscheidung trifft der Mensch.**

Hero: „Von 100 Bewerbungen zur richtigen Einstellung." Markenzeile:
„Lies die Shortlist, nicht den Stapel." Nach der Einstellung übernimmt das
HR-System des Kunden; Revetly ersetzt es nicht.

Firmierung: **Revetly e.U.**, österreichischer eingetragener Unternehmer.
Zielmarkt DACH, Produktsprache durchgehend Deutsch, Du-Ansprache.

Drei Zielgruppen, geschnitten nach dem Stapel pro Stelle: Personaldienstleister
und Recruiter, Unternehmen mit vielen offenen Stellen, Betriebe mit einer Stelle
und vollem Posteingang. Details in `.agents/product-marketing.md`.

---

## 2 · Technischer Aufbau

| Baustein | Version / Wahl |
|---|---|
| Framework | Next.js 16.2 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS v4 (`@theme`), shadcn/ui |
| Datenhaltung | Supabase (Postgres, Auth, Storage), RLS owner-scoped |
| Abrechnung | Stripe 22 (aktuell noch Testmodus) |
| KI | Vercel AI SDK 6 mit `@ai-sdk/mistral`, Mistral AI (Frankreich) |
| Mailversand | Lettermint (Europa), Resend nur noch als Übergangsbrücke |
| Validierung | Zod 3 |
| Datenabruf im Client | SWR 2 |
| Hosting | Vercel, Deployment von `main` |

Bewusste Konfiguration in `next.config.mjs`:
- `images: { unoptimized: true }`: deshalb ist ein einfaches `<img>` gleichwertig
  zu `next/image`, und `remotePatterns` braucht es nicht.
- `serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist"]`: die nativen
  Abhängigkeiten für Lebenslauf-Fotos bleiben aus dem Bundler heraus.
  `outputFileTracingIncludes` lässt den Vercel-Build reproduzierbar abstürzen,
  der pdfjs-Worker kommt deshalb über ein `require.resolve()`-Literal herein.
- `typescript: { ignoreBuildErrors: true }`: **Altlast, sollte weg.**
  `npx tsc --noEmit` läuft fehlerfrei durch, das Flag kostet also nichts mehr
  und verhindert danach stille Deploys mit kaputten Typen.

### Verzeichnisse

```
app/(app)/       angemeldeter Bereich: dashboard, jobs, candidates, inbox,
                 termine, settings, subscription, help
app/api/         rund 50 Routen, darunter stripe/, scheduling/, calendar/,
                 cron/, matching/, public/, monitoring/
app/apply/       öffentliche Bewerbungsseite pro Stelle
app/jobs/        öffentliche Stellenseite (indexierbar)
app/agb|impressum|datenschutz/   Rechtstexte
app/blog/        sechs SEO-Beiträge
components/landing/   die Marketing-Startseite, Präfix rv-
lib/ai/          provider.ts (Modellwahl), generate.ts
lib/matching/    imlrs.ts, dossier.ts, hard-facts.ts, calibration.ts, pool-rank.ts
lib/email/       client.ts (Lettermint/Resend), routing, scheduling, attachments
lib/dsgvo|scheduling|stripe|training|monitoring/
scripts/         SQL-Migrationen 001-027, jeweils mit .md-Erläuterung
scripts/eval/    Golden Set + run-eval.mjs für die Matching-Qualität
```

---

## 3 · Der Kern: die Revetly Match Analyse (intern IMLRS 2.0)

Implementiert in `lib/matching/imlrs.ts`. Das ist das eigentliche Produkt,
alles andere ist Drumherum.

Vier Stufen, nacheinander:

1. **Dossier**: aus dem vollständigen Lebenslauftext entsteht ein
   strukturiertes Karriere-Dossier. Wird pro Kandidat gecacht.
2. **Hard Facts**: deterministisch, ohne Modell: Welche geforderten
   Fähigkeiten sind tatsächlich gedeckt, wie viele Jahre, welche Sprachen.
3. **Judge**: ein Modell bewertet neun Ebenen nach strenger Rubrik,
   Temperatur 0.
4. **Verifier**: ein zweites Modell prüft jede Kategorie unabhängig gegen
   Rubrik und Belege und korrigiert. Vier-Augen-Prinzip. Beide Urteile bleiben
   im Protokoll sichtbar.

Danach rechnet **Code** zusammen, nicht das Modell: Korrekturen des Verifiers
werden gedeckelt, Hard-Fact-Caps angewandt, die gewichtete Summe deterministisch
gebildet.

**Der entscheidende Kniff:** Die Feldreihenfolge im Zod-Schema erzwingt
Chain-of-Thought. Das Modell muss `belege`, dann `begruendung`, dann `konfidenz`
schreiben, **bevor** es eine Zahl ausgeben darf. Wer die Reihenfolge ändert,
zerstört die Begründungsqualität, ohne dass ein Test das merkt.

Die neun Ebenen mit ihren Gewichten:

| Ebene | Gewicht |
|---|---|
| Hard Skills | 0,20 |
| Berufserfahrung | 0,20 |
| Ausbildung | 0,10 |
| Branche | 0,10 |
| Kultur-Fit | 0,10 |
| Soft Skills | 0,10 |
| Sprachen | 0,05 |
| Standort | 0,05 |
| Gehaltsvorstellung | 0,05 |

**Qualifikationssperre.** Fehlt eine geforderte Berufszulassung (Diplom,
Nostrifikation, Zertifikat), deckelt Revetly den Gesamtscore hart. Fehlende
Zulassung lässt sich nicht durch Sprachkenntnisse oder Kultur-Fit wegrechnen.
Ausdrücklicher Kundenwunsch, entstanden am Beispiel einer Bürokraft ohne
Pflegeausbildung, die auf eine Pflegestelle 28 Prozent erreichte.

**Das Gespräch zählt mit (Migration 029).** Jede Antwort im strukturierten
Gespräch bekommt 1 bis 5 Punkte. Das Ergebnis fließt in den Match ein:
`Match = Analyse × 0,6 + Gespräch × 0,4`. Dafür gibt es zwei Spalten:
`screening_score` ist der reine Analysewert, `match_score` der Match, den
Nutzer sehen. Gemischt wird per Trigger in der Datenbank, weil mehrere Stellen
den Score schreiben. Die Qualifikationssperre deckelt auch den gemischten
Wert, und bei K.O. kann das Gespräch den Match nur senken. Kalibrierung,
Qualitätsprüfung und Bestenvergleich lesen den reinen Analysewert
(`lib/matching/screening.ts`), sonst zählte das Gespräch doppelt.

**Kalibrierung.** Ein nächtlicher Cron (`/api/cron/calibrate-matching`, 04:00
UTC) lernt aus den Entscheidungen eines Kontos und justiert dessen Gewichte.
Seit v2 nur mit Einwilligung, und die Gewichte wirken nur in Pro und
Enterprise. Siehe Abschnitt 5.

**Laufzeit.** Ein vollständiger Durchlauf dauert rund 60 Sekunden, vier
Modellaufrufe nacheinander. Beim erneuten Matchen desselben Kandidaten entfällt
das Dossier, dann etwa 45 Sekunden. Das ist der Grund, warum in der Marketing-
Copy **keine Sekundenversprechen** stehen dürfen.

---

## 4 · Preise

Verbindlich in `lib/plans.ts`. Jahrespreis ist zehnmal der Monatspreis, also
zwei Monate geschenkt.

| Plan | Monat | Matches | Stellen |
|---|---|---|---|
| Free | 0 € | 25, einmalig | 1 Probestelle |
| Starter | 99 € | 50 pro Monat | 3 aktive |
| Growth | 249 € | 300 pro Monat | 10 aktive |
| Pro | 499 € | 1.000 pro Monat | unbegrenzt |
| Enterprise | Verhandlung | individuell | unbegrenzt |

**Free ist seit Migration 028 eine einmalige Probestelle**, kein Dauertarif:
eine pro Firmendomain, Freemail-Adressen ausgeschlossen, gezählt wird, was
verbraucht beziehungsweise angelegt wurde. Die Regel lebt in der Datenbank
(`consume_match`, `match_usage`, `job_quota`), Details in
`scripts/028_free_trial_lifetime.md`. Die Zahlen stehen in `lib/plans.ts` und
müssen mit `plan_match_limit` / `plan_job_limit` übereinstimmen.

Die `features`-Arrays in `lib/plans.ts` folgen der Wortwahl der Landing Page.
Die ersten zwei Einträge sind strukturell Kontingent und Stellen, weil die
Abo-Seite ab Index 2 und die Paywall die ersten fünf anzeigt.

---

## 5 · Datenschutz als Konstruktionsprinzip

Das ist kein Feature, sondern eine Randbedingung, die viele Entscheidungen
erklärt.

- Verarbeitung **ausschließlich in der EU**. Deshalb Mistral (Frankreich) statt
  OpenAI, deshalb Lettermint (Europa) statt Resend (USA).
- `AI_ALLOW_NON_EU_FALLBACK` ist absichtlich **aus**. Nur so ist zugesichert,
  dass Bewerberdaten die EU nie verlassen. Wer ihn aktiviert, muss Google als
  Auftragsverarbeiter in der Datenschutzerklärung nennen.
- **Revetly lernt nur für das eigene Konto und nur mit Zustimmung.** Die
  Kalibrierung pro Konto läuft nur mit Einwilligung in der aktuellen Fassung
  (`CONSENT_VERSION` in `lib/training/consent.ts`, pro Einwilligung gespeichert,
  Nachweispflicht Art. 7 Abs. 1 DSGVO). Ein Widerruf löscht die angepassten
  Gewichte sofort (Trigger aus 029). Das **gemeinsame Modelltraining** über
  Kunden hinweg ist abgeschaltet (`AI_SHARED_TRAINING`, Standard aus), weil es
  der Zusage widerspricht. Wer es einschaltet, muss vorher Landing Page, FAQ,
  Einwilligungstext, Datenschutzerklärung §5 und AGB §10 ändern.
- **Automatische Löschung nach 180 Tagen** (`RETENTION_DAYS` in
  `app/api/cron/purge-candidates/route.ts`). Bewerber können ihre Löschung
  zusätzlich selbst anstoßen (`/datenschutz/loeschung`).
- Fehlermeldungen werden vor dem Speichern pseudonymisiert
  (`lib/training/anonymize.ts`).
- Revetly ist bezüglich Bewerberdaten **Auftragsverarbeiter**, der Kunde ist
  Verantwortlicher. Für die Plattform selbst ist Revetly verantwortlich.

---

## 6 · Verbindliche Regeln für Texte und Code

Diese sind im Lauf der Arbeit festgelegt worden und gelten weiter.

### Sprache und Marketing

1. **Nichts erfinden.** Keine Nutzerzahlen, keine Testimonials, keine Bewertungen,
   keine „vertrauen bereits 500 Teams". Das ist kein Stilthema, sondern ein
   rechtliches: UWG-Anhang und Richtlinie 2005/29/EG. Das Produkt hat noch keine
   zahlenden Kunden, also sagt die Seite das auch. Fehlt eine Zahl, kommt sie
   nicht rein.
2. **„Bewertung" und „bewerten" in allen Formen kommen auf der Landing Page
   nicht vor.** Stattdessen: Match, Passung, prüfen, Ranking. Rechtstexte und
   Dashboard sind ausgenommen.
3. **Keine Gedankenstriche** im Fließtext, weder Halbgeviert noch Geviert.
   Stattdessen Punkt, Komma, Doppelpunkt oder Klammer.
4. **Keine Ausrufezeichen.**
5. **Keine KI-, Mail- oder Zahlungsanbieter namentlich** in der Marketing-Copy
   (kein Mistral, Lettermint, Resend, Stripe). Google- und Microsoft-Kalender
   dürfen genannt werden. In Datenschutzerklärung und AVV-Liste
   selbstverständlich schon.
6. **Keine Zeitversprechen** in Sekunden oder Minuten. Siehe Laufzeit oben.
7. **Du-Ansprache durchgehend**, auch in Blog-Teasern auf der Startseite
   (Feld `teaser` in `lib/blog/posts.ts`; die Artikel selbst siezen).
8. **Kontingentzahlen nie hart schreiben**, immer aus `PLANS` ableiten.
9. **Jede Produktaussage muss der Code decken.** Wer eine Aussage auf der
   Landing Page ändert, prüft sie gegen das Produkt. Bei v2 hat genau diese
   Prüfung vier Lücken aufgedeckt, die dann im Produkt geschlossen wurden
   (Gespräch im Match, Stelle abschließen, Absagen für alle, Lernen nur mit
   Zustimmung).

### Code

- **Kommentare auf Deutsch**, und sie erklären das *Warum*, nicht das *Was*.
  Besonders dort, wo eine Lösung gegen die Intuition läuft.
- Kommentare im Bestand verwenden teils Umlaut-Umschreibungen (`ae`, `oe`, `ue`).
  Das ist gewachsen, nicht Absicht.
- Commit-Nachrichten auf Deutsch, Betreffzeile knapp, Rumpf erklärt die
  Begründung. Konvention `feat(bereich):`, `fix(bereich):` wird verwendet, aber
  nicht streng.

---

## 7 · Designsystem

Tokens in `app/globals.css` unter `:root`:

```
--rv-cyan       #22C1EE      --rv-ink        #0C1A16
--rv-green      #16C77C      --rv-ink-soft   #2C3D38
--rv-cyan-deep  #0E96C4      --rv-muted      #506A63
--rv-green-deep #0E9F62      --rv-mist       #F1F6F4
--rv-gradient   linear-gradient(130deg, cyan 0%, green 100%)
--rv-radius 20px / -lg 30px / -xl 38px / -pill 999px
--rv-shadow-sm / --rv-shadow / --rv-shadow-lg
```

Die Landing-Komponenten tragen alle das Präfix `rv-`. Scroll-Einblendungen
laufen über `useReveal()` und die Klasse `reveal` mit `data-dir`.

---

## 8 · Git, Branches, Deployment

**Vercel baut `main`.** Das ist die Produktionslinie.

Daneben existiert `feat/match-counter-system`, das den Stand von `main`
trägt; es wird parallel mitgeschoben.

**Positionierung v2 ist live.** `feat/positionierung-v2` wurde am 25.09.2026
per Fast-Forward nach `main` gemerged (`ab51ca1`): neue Landing Page,
Probestelle (028) und das Produkt passend zur Landing Page (029). Die
Migrationen 023, 028 und 029 waren vorher in Supabase eingespielt.

**`claude/design-handoff-audit-j3761y` ist tot und darf nicht gemerged werden.**
Der Branch ist ein Abzug des Projekts vom 3. Juli 2026 mit einem aufgesetzten
Dashboard-Redesign und hat **keinen gemeinsamen Vorfahren** mit `main`
(`git merge-base` liefert nichts). Ein Merge würde 168 Dateien löschen:
Stripe-Abrechnung, Terminplanung, Mail-Eingang, DSGVO-Löschung, Blog,
Rechtstexte, Fehler-Monitoring, Matching-v2 und alle Cron-Jobs. Eigenständig
liegen dort genau zwei Dateien, eine davon ein Vorläufer der heutigen
Apply-Route ohne Missbrauchsschutz. Sein Wert ist rein optisch, und die Flächen,
die er umgestalten würde, hat `main` seither selbst weiterentwickelt. Wer die
Optik will, baut sie auf dem heutigen `main` neu. Der Stand bleibt über den
Commit `45a8b8d` erreichbar, auch ohne Branch.

---

## 9 · Was vor dem Go-Live noch offen ist

Vollständig und abhakbar in `docs/GO-LIVE.md`. Die Blocker in Kürze:

1. **Das Matching läuft in Produktion nicht.** `lib/ai/provider.ts:43` und `:49`
   setzen `reasoning` und `verification` auf `mistral-large-latest`. Der aktuelle
   Mistral-Tarif antwortet mit „This model is not available in your subscription
   tier", der Score bleibt leer, der Kandidat zeigt „Fehler". Fix: entweder
   `AI_MODEL_REASONING` und `AI_MODEL_VERIFICATION` auf `mistral-small-latest`
   setzen, oder den Tarif hochstufen. Danach `scripts/eval/run-eval.mjs` fahren.
2. **Rechtstexte enthalten Platzhalter.** Impressum (Inhaber, Anschrift,
   Firmenbuchnummer, UID, WKO-Fachgruppe), AGB (Gerichtsstand), Datenschutz
   (Verantwortlicher). Beim Impressum sind das Pflichtangaben nach ECG und UGB,
   in AT und DE unmittelbar abmahnfähig.
3. **Migrationsstand.** 030 (Befunde der Dokumentprüfung) ist angelegt, aber
   noch nicht eingespielt. 023, 028 und 029 sind seit 25.09.2026 eingespielt,
   019 bis 022 waren es laut Inhaber schon vorher. Für 015 bis 018 und 024
   bis 027 steht die Bestätigung noch aus; `015_rls_hardening.sql` ist dabei
   der wichtigste Einzelpunkt, ohne sie sind die Daten nicht owner-scoped.
4. **Stripe steht im Testmodus.** Live-Key, eigener Live-Webhook, Stripe Tax.
   Achtung: `automatic_tax` steht **gar nicht** im Code, auch nicht
   auskommentiert, und muss erst geschrieben werden.
5. **Die Domain ist noch nicht registriert.** Am 19.09.2026 hatte weder
   `revetly.ai` noch `.com`, `.at` oder `.de` Nameserver hinterlegt. Der Grund
   für Eile ist nicht die Website, sondern der Mailversand: SPF und DKIM müssen
   propagieren, und eine frische Absenderdomain braucht Zustellreputation. Das
   ist der Punkt mit der längsten Vorlaufzeit.

Pflicht-Umgebungsvariablen, die still fail-closed laufen, wenn sie fehlen:
`MISTRAL_API_KEY`, `SCHEDULING_TOKEN_KEY`, `CRON_SECRET`, `RATE_LIMIT_SALT`,
`MONITORING_ADMIN_EMAIL`, `ERROR_NOTIFY_EMAIL`, `INBOUND_WEBHOOK_SECRET`,
`NEXT_PUBLIC_SITE_URL`.

Kleineres, alles billig zu erledigen: `ignoreBuildErrors` abschalten,
`pnpm lint` reparieren (es gibt keine `eslint.config.js`, ESLint 10 liest die
alte Form nicht) und das verirrte Verzeichnis `undefined/` im Repo-Root
entfernen. Die toten Social-Links im Footer und der tote TODO in der
Kandidatenliste sind auf `feat/positionierung-v2` erledigt.

---

## 10 · Entscheidungsprotokoll

Warum Dinge so sind, wie sie sind. Das spart einer neuen Session das
Wiederaufrollen.

**Mistral statt OpenAI.** Nicht wegen Qualität, sondern wegen EU-Verarbeitung.
Dieselbe Begründung trägt Lettermint statt Resend.

**Zwei Modelle statt eines.** Der Verifier ist teuer und verdoppelt die
Laufzeit. Er bleibt, weil „belegt und gegengeprüft" das Verkaufsargument ist,
das Revetly von einer Schlagwortsuche unterscheidet.

**Aggregation in Code, nicht im Modell.** Ein Modell, das am Ende selbst
summiert, lässt sich von seiner eigenen Begründung überreden. Die gewichtete
Summe ist deshalb deterministisch.

**Keine erfundenen Testimonials.** Wurde im Verlauf mehrfach angefragt und
mehrfach abgelehnt, mit Verweis auf UWG. Stattdessen stehen dort
Zielgruppensegmente. Dasselbe gilt für eine gefälschte Trust-Leiste.

**Compare-Slider statt Video.** Für die Vorher-Nachher-Sektion lag
Remotion nahe. Remotion rendert aber Videos, gefragt war ein interaktives
Element auf der Seite. Umgesetzt mit CSS `clip-path: inset()` und einem
unsichtbaren `<input type="range">` darüber, was Maus, Touch, Tastatur und
Screenreader auf einmal erledigt, statt eigener Pointer-Logik.

**Text liegt im Slider je Hälfte, nicht über die volle Breite.** Der erste
Entwurf lief durch und der Trenner schnitt mitten in die Sätze
(„Die Revetly-Realitätuiting-Chaos"). Beide Texte haben jetzt ihre eigene
Hälfte, blenden aus, bevor sie angeschnitten wirken, und die dekorativen
Hälften vertragen den Schnitt.

**Hero-Bild ab `lg` von links eingerückt statt per `object-position`
verschoben.** Das Foto ist kaum breiter als seine Fläche und hat deshalb fast
keinen Verschiebespielraum. Gemessen: 70 % auf 45 % bewegte das Motiv rund
2 % der Breite. Die linke Kante wird per `mask-image` weich ausgeblendet, sonst
entstünde eine Naht.

**Die Landing-Copy ist mehrfach überarbeitet worden.** Reihenfolge: Premium-
SaaS-Ton, dann `/copywriting`, dann `writing-landing-page-copy`, dann eine
Neuausrichtung der Leitaussage von Nachvollziehbarkeit auf Tempo, ein Abgleich
gegen den Slop-Katalog, und zuletzt **Positionierung v2** („alles zwischen
Stellenanzeige und Zusage, die Entscheidung triffst du"). v2 ist der gültige
Standard.

**Schutz vor verstecktem Text in Bewerbungen (26.09.2026).** Frage des
Inhabers war, ob Revetly erkennen kann, ob eine Bewerbung mit KI geschrieben
wurde. Entscheidung: nein, weil das nicht verlässlich geht, Nicht-Muttersprachler
überdurchschnittlich oft fälschlich trifft und unter AI Act (Hochrisiko,
Anhang III) und Gleichbehandlungsrecht heikel ist. Stattdessen gebaut, was
nachprüfbar ist: `lib/document-guard` entfernt Text, den ein Mensch im
Dokument nicht sieht, bevor ein Modell ihn liest (PDF per Rendering und
Kontrastprüfung, DOCX per Formatierung), meldet sichtbare Sätze an eine KI,
und jeder Prompt mit Bewerbertext trägt die Regel aus
`lib/ai/applicant-text.ts`. Befunde mit Beleg stehen beim Kandidaten
(Migration 030). Dazu der Abgleich Anschreiben gegen Lebenslauf
(`lib/interview/claims.ts`): Beim Erstellen des Gesprächsleitfadens werden
prüfbare Aussagen aus dem Anschreiben (Dauer, Rollen, Ergebnisse, Werkzeuge,
Abschlüsse, Sprachen) mit dem Lebenslauf abgeglichen. Jede Aussage muss
wörtlich im Anschreiben stehen, jeder Beleg oder Widerspruch wörtlich im
Lebenslauf, sonst wird sie verworfen. Bis zu drei offene Aussagen (Abweichungen
zuerst) werden zu Nachfragen mit Bewertungsskala. Der Abgleich selbst ändert
den Match nicht, nur die Bewertung der Antworten zählt wie jede
Leitfaden-Frage. Keine Migration, gespeichert im Leitfaden
(`interview_guide.anschreibenAbgleich`).

**Bei v2 wurde das Produkt an die Texte angepasst, nicht umgekehrt.** Die
Gegenprüfung ergab vier Aussagen, die der Code nicht deckte. Entscheidung des
Inhabers: Die v2-Texte sind der Standard. Umgesetzt wurde deshalb:
- Das Gespräch fließt in den Match ein (029, Gewicht 40 Prozent, gedeckelt
  durch Qualifikationssperre und K.O.).
- „Stelle abschließen" schließt die Stelle, setzt offene Bewerber auf
  „Abgesagt" und verschickt auf Wunsch die Absagen
  (`/api/jobs/[id]/close`, Dialog im Stellen-Detail, Angebot direkt nach
  „Eingestellt").
- Absage-Mails in allen Plänen statt nur Growth und Pro. Der Endpunkt wurde
  dabei gehärtet: Empfänger nur aus der eigenen Kandidatenliste, Text für HTML
  maskiert, Mengenbremse. Vorher nahm er Adresse und Text ungeprüft an und
  setzte den Text roh ins HTML.
- Lernen nur für das eigene Konto und nur mit Zustimmung (Abschnitt 5).

**Probestelle statt Gratistarif (028).** Einmal pro Konto und Firmendomain,
freigeschaltet erst nach bestätigter E-Mail, damit niemand mit einer fremden
Adresse die Probestelle einer ganzen Domain verbrennt. Dabei fiel auf, dass
jeder angemeldete Nutzer seine Profilzeile komplett selbst ändern konnte,
einschließlich des Plans. 028 schließt das mit einem Spaltenschutz.

---

## 11 · Fallen, die schon einmal Zeit gekostet haben

Technische Eigenheiten, die nicht offensichtlich sind und mehrfach zugeschlagen
haben.

**`srcSet` schlägt `src`.** Beim Austausch eines Bildes gegen eine einzelne neue
Datei muss ein vorhandenes `srcSet` weg. W-Deskriptoren gewinnen, das neue Bild
wird sonst stillschweigend ignoriert.

**`object-position` wirkt umgekehrt zur Intuition.** Ein *kleinerer* Prozentwert
zeigt mehr vom linken Bildrand, das Motiv rückt also nach **rechts**.

**`background-clip: text` verträgt kein `text-shadow`.** Die Glyphen sind mit
dem Verlauf gefüllt, ein Textschatten bleibt wirkungslos. Lösung:
`filter: drop-shadow()` auf einem Vorfahren.

**Eine CSS-Animation belegt ihre Eigenschaft.** `.rv-hw` animiert `filter` für
die Einblendung. Ein zweiter `filter` am selben Element wird überschrieben.
Dasselbe gilt für `transform` und die Ken-Burns-Animation im Hero.

**`animation: … ` als Kurzform setzt die Dauer auf `0s`.** `animation-timeline:
view()` braucht aber `animation-duration: auto`. Kurzform und Scroll-Timeline
vertragen sich nicht.

**`overflow: hidden` erzeugt einen Scroll-Container** und bricht damit `view()`.
`overflow: clip` tut das nicht.

**`flex-wrap` plus ein leeres Element mit `basis-full`** erzwingt einen
Zeilenumbruch. So stehen im Hero die Wörter dort, wo sie sollen.

**Der Stop-Hook und das Committen.** `git commit -F -` mit Heredoc scheitert
reproduzierbar beim ersten Versuch mit Exit 1 und gelingt beim identischen
zweiten. Einfach wiederholen.

**`node_modules` war einmal komplett leer** (0 Einträge) bei 30 GB freier
Platte. Symptom waren fehlende Basispakete wie `clsx` im Build. Heilung:
`pnpm install --frozen-lockfile`.

**Der Slopmonster-Linter ist rein englisch.** Auf deutschen Text gibt er
verlässlich 5/5 CLEAN, auch bei offensichtlichem Slop. Gegengetestet: derselbe
Absatz erreicht auf Englisch 3/5, auf Deutsch 4/5, und gefunden wird dort nur
das Lehnwort „robust". Der Katalog muss auf Deutsch von Hand angewandt werden,
`references/signs-of-ai-writing.md` ist dafür die Quelle. Der Cleanse-Schritt
verlangt außerdem eine fremde Modellfamilie und ist in einer reinen
Claude-Umgebung nicht sinnvoll durchführbar.

---

## 12 · Arbeitsweise in diesem Repo

- Prüfen mit `pnpm build` und `npx tsc --noEmit`. `pnpm lint` ist derzeit kaputt.
- Matching-Qualität prüfen mit `node scripts/eval/run-eval.mjs` gegen den
  Golden Set, und über `/api/matching/eval` beziehungsweise
  `/api/matching/quality` im laufenden Betrieb.
- Bei Problemen im Matching liefert `/api/matching/diagnose` die
  Modellkette und den konkreten Fehler des Providers. Das war der Weg, auf dem
  der Tarif-Fehler gefunden wurde.
- Änderungen an der Landing Page möglichst im Browser gegenprüfen. Chromium
  liegt unter `/opt/pw-browsers/chromium`, Playwright ist darauf konfiguriert,
  `playwright install` ist nicht nötig.
- SQL-Migrationen sind additiv und idempotent, die Reihenfolge ist egal. Zu
  jeder nennenswerten Migration liegt eine `.md` mit Erläuterung daneben.
