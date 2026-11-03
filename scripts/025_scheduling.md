# 025 — Terminplanung und Buchung

Eigenes Kalender- und Buchungssystem, ohne externen Dienst. Recruiter legen
ihre Zeiten fest, Bewerber buchen selbst. Google Workspace und Microsoft 365
sind optional anbindbar.

## Wie es funktioniert

1. Der Recruiter hinterlegt unter **Termine** seine Wochenzeiten, Puffer und
   Terminarten (Erstgespräch 30 Min, Fachinterview 60 Min …).
2. Im Job-Container wählt er bei einem Bewerber „Zum Interview einladen" und
   die Variante **Bewerber wählt**. Revetly erzeugt einen persönlichen Link und
   verschickt ihn per E-Mail.
3. Der Bewerber öffnet `/termin/<token>`, sieht die freien Zeiten und bucht.
4. Die Buchung landet in Revetly, im verbundenen Kalender und als
   ICS-Anhang in beiden Postfächern.

## Warum Freie-Zeiten-Abfrage statt Synchronisation

Belegtzeiten werden bei jeder Anfrage live beim Anbieter erfragt
(Google `freeBusy`, Microsoft `getSchedule`). Das bedeutet:

- keine Webhooks, keine Sync-Zustände, kein veralteter Stand,
- keine fremden Kalenderinhalte in unserer Datenbank (nur „belegt von/bis"),
- ein Aufruf pro Buchungsseite statt eines dauerhaften Abgleichs.

Fällt ein Anbieter aus, rechnet Revetly ohne diese Quelle weiter und vermerkt
den Fehler am Konto. Eine dauerhaft leere Buchungsseite kostet mehr als ein
Termin, der einmal verschoben werden muss.

## Zeitzonen

Termine liegen als `timestamptz` in der Datenbank, definiert werden sie aber
lokal („Dienstag 9 bis 17 Uhr"). Die Umrechnung steht in
`lib/scheduling/timezone.ts` und rechnet pro Tag neu, damit „ab 9 Uhr" auch
nach der Zeitumstellung 9 Uhr bleibt. Der Zeitzonenabstand wird über
`Intl.DateTimeFormat` bestimmt, in zwei Durchläufen, weil er selbst vom
Zeitpunkt abhängt.

## Einrichtung der OAuth-Apps

Beides ist **optional**. Ohne diese Variablen funktioniert die Buchung, nur
ohne Abgleich mit dem echten Kalender. Alle Adressen laufen über die
Hauptadresse **`https://www.revetly.ai`**. Die Weiterleitungs-URI baut der
Code aus `NEXT_PUBLIC_SITE_URL`; sie muss beim Anbieter Zeichen für Zeichen
gleich hinterlegt sein, sonst kommt `redirect_uri_mismatch`.

Nach jeder Änderung prüfen: **Termine → Kalender → Diagnose**. Der Selbsttest
zeigt, ob Schlüssel, App und Weiterleitung passen, ohne dass jemand verbinden
muss.

### Pflicht, sobald ein Kalender verbunden werden soll

```
SCHEDULING_TOKEN_KEY=<openssl rand -base64 32>
```

Damit werden die OAuth-Tokens verschlüsselt (AES-256-GCM) und die
OAuth-`state`-Parameter signiert. Fehlt der Schlüssel, verweigert Revetly das
Speichern von Zugängen. **Nicht tauschen**: Mit neuem Schlüssel müssen alle
Kunden ihren Kalender neu verbinden.

### Google Workspace und Gmail

Google Cloud Console (console.cloud.google.com), am besten mit dem Konto, das
auch die Search Console für revetly.ai hat:

1. Neues Projekt „Revetly“. **APIs & Dienste → Bibliothek → Google Calendar
   API → Aktivieren.**
2. **Google Auth Platform → Branding**
   - App-Name `Revetly`, Support-Mail `hallo@revetly.ai`, Logo (120×120 px,
     `public/icon-512.png` verkleinert)
   - Startseite `https://www.revetly.ai`
   - Datenschutzerklärung `https://www.revetly.ai/datenschutz`
   - Nutzungsbedingungen `https://www.revetly.ai/agb`
   - Autorisierte Domain `revetly.ai`. Google verlangt, dass sie in der
     Search Console bestätigt ist (DNS-TXT-Eintrag in Cloudflare).
3. **Zielgruppe:** Extern.
4. **Datenzugriff → Bereiche hinzufügen**, genau diese:
   - `https://www.googleapis.com/auth/calendar.freebusy`
   - `https://www.googleapis.com/auth/calendar.events.owned`
   - `openid`, `.../auth/userinfo.email`
5. **Clients → Client erstellen**, Typ Webanwendung, autorisierte
   Weiterleitungs-URI:
   `https://www.revetly.ai/api/calendar/callback/google`
6. Client-ID und Secret in Vercel (Production):
   ```
   GOOGLE_CALENDAR_CLIENT_ID=...apps.googleusercontent.com
   GOOGLE_CALENDAR_CLIENT_SECRET=GOCSPX-...
   ```
7. **Zielgruppe → App veröffentlichen** („In Produktion“). Im Status
   „Testen“ laufen Zugänge nach 7 Tagen ab, und nur eingetragene Testnutzer
   können verbinden.
8. **Prüfung beantragen** (Verification Center). Beide Kalender-Bereiche
   gelten als sensibel. Bis zur Freigabe sehen Kunden beim Verbinden den
   Hinweis „Google hat diese App nicht überprüft“ (über „Erweitert“ geht es
   trotzdem weiter), und es können höchstens 100 Konten verbinden. Google
   verlangt dafür:
   - eine Begründung je Bereich, Textvorschlag unten,
   - ein kurzes Video (YouTube, nicht gelistet): Termine öffnen → „Google
     Kalender verbinden“ → Zustimmungsseite mit sichtbarer Client-ID in der
     Adresszeile → Buchungslink → gebuchter Termin erscheint im Kalender,
   - den Absatz zur eingeschränkten Nutzung in der Datenschutzerklärung
     (steht in Abschnitt 5, „Kalenderanbindung“).

   Begründung (Englisch, so einreichen):
   > *calendar.freebusy:* Revetly is a recruiting tool. Recruiters send
   > candidates a booking link; to offer only times the recruiter is free,
   > Revetly queries the recruiter's free/busy information. No event details
   > are read or stored.
   >
   > *calendar.events.owned:* When a candidate books an interview, Revetly
   > creates the event in the recruiter's own calendar (with a Google Meet
   > link for remote interviews) and deletes it if the interview is
   > cancelled. Revetly does not read or modify any other events.

Google Meet-Links entstehen beim Anlegen des Termins über `conferenceData`,
ein weiterer Bereich ist dafür nicht nötig. Beim Trennen widerruft Revetly
den Zugang bei Google (`oauth2.googleapis.com/revoke`).

### Microsoft 365

Microsoft Entra Admin Center (entra.microsoft.com):

1. **Anwendungen → App-Registrierungen → Neue Registrierung**
   - Name `Revetly`
   - Unterstützte Kontotypen: **Konten in einem beliebigen
     Organisationsverzeichnis** (mehrinstanzenfähig). Private Konten
     (outlook.com) bieten keine Teams-Links und keine Verfügbarkeitsabfrage.
   - Umleitungs-URI, Plattform **Web**:
     `https://www.revetly.ai/api/calendar/callback/microsoft`
2. **API-Berechtigungen → Berechtigung hinzufügen → Microsoft Graph →
   Delegiert:** `Calendars.ReadWrite`, `User.Read`, `offline_access`,
   `openid`, `email`. Keine Administratorzustimmung nötig.
3. **Zertifikate & Geheimnisse → Neuer geheimer Clientschlüssel**, Laufzeit
   24 Monate. Den **Wert** (nicht die ID) sofort kopieren. Ablaufdatum im
   Kalender vormerken: Danach schlagen alle Microsoft-Verbindungen fehl, bis
   ein neuer Schlüssel in Vercel steht.
4. In Vercel (Production):
   ```
   MICROSOFT_CALENDAR_CLIENT_ID=<Anwendungs-ID (Client)>
   MICROSOFT_CALENDAR_CLIENT_SECRET=<Wert des Geheimnisses>
   MICROSOFT_CALENDAR_TENANT=organizations
   ```
   Neu deployen.
5. **Branding & Eigenschaften → Herausgeberdomäne → Domäne konfigurieren →
   `revetly.ai`** auswählen und „Verifizieren“. Revetly liefert die dafür
   nötige Datei unter
   `https://www.revetly.ai/.well-known/microsoft-identity-association.json`
   automatisch aus (aus `MICROSOFT_CALENDAR_CLIENT_ID`, als
   `application/json`). Microsoft ruft die Datei unter der eingetragenen
   Domain ab. Ob es dabei der Weiterleitung von `revetly.ai` auf `www`
   folgt, sagt Microsofts Doku nicht. Scheitert die Prüfung mit `revetly.ai`,
   als Domain `www.revetly.ai` eintragen, dort liegt die Datei direkt. Vorher
   die Adresse im Browser öffnen und prüfen, ob die Client-ID darin steht.
6. **Herausgeber verifizieren** (gleiche Seite, „Verifizierter Herausgeber“):
   braucht eine kostenlose ID aus dem Microsoft AI Cloud Partner Program.
   Ohne Verifizierung zeigt Microsoft „nicht verifiziert“, und viele
   Firmen-Mandanten lassen Mitarbeiter dann nicht selbst zustimmen; ihr
   IT-Admin muss die App einmal freigeben.

`offline_access` ist notwendig, sonst läuft die Verbindung nach einer Stunde
ab. Microsoft rotiert Refresh-Tokens bei jedem Erneuern, Revetly speichert den
jeweils neuen. Beim Anlegen eines Termins mit Teilnehmer verschickt Outlook
selbst eine Besprechungseinladung an den Bewerber, zusätzlich zur Mail von
Revetly. Google lässt sich das abstellen (`sendUpdates=none`), Microsoft nicht.

### Was ein Kunde sieht

- **Termine → Kalender verbinden** (oder direkt im Einladungsfenster):
  Anmeldung beim Anbieter in einem kleinen Fenster, danach steht das Konto
  in der Liste.
- **Bewerber wählt:** Der Buchungslink zeigt nur Zeiten, die im Kalender
  frei sind. Der gebuchte Termin landet im Kalender, bei Video mit Link.
- **Fester Termin:** Der Termin wird ebenfalls eingetragen, bei „Remote“ mit
  Meet- oder Teams-Link, der in der Einladung an den Bewerber steht.
- **Absagen** unter Termine löscht den Eintrag im Kalender und schickt dem
  Bewerber eine Absage samt Kalender-Storno.
- Im Team verbindet jede Person ihren eigenen Kalender; eingetragen wird
  immer bei der Person, die einlädt.

## Datenschutz

- Zugangstokens liegen verschlüsselt, der Client bekommt sie nie zu sehen.
- Buchungslinks werden nur als SHA-256-Abdruck gespeichert. Aus der Tabelle
  lässt sich kein gültiger Link bauen.
- Google bekommt beim Verbinden nur die Bereiche „Verfügbarkeit“ und
  „Termine in eigenen Kalendern“. Beim Trennen widerruft Revetly den Zugang.
- Google und Microsoft sind Anbieter außerhalb der EU. Ohne Verbindung
  verlassen keine Termindaten die EU. Wird verbunden, gehören beide in die
  Auftragsverarbeiter-Liste des jeweiligen Kunden.
- `/termin/<token>` ist per `robots`-Metadaten und `robots.txt` von der
  Indexierung ausgenommen.

## Tabellen

| Tabelle | Zweck |
| --- | --- |
| `calendar_accounts` | verbundene Google-/Microsoft-Konten samt verschlüsselter Tokens |
| `scheduling_profiles` | Wochenzeiten, Puffer, Vorlaufzeit, Zeitzone (eines pro Kunde) |
| `meeting_types` | angebotene Terminarten (Name, Dauer, Ort) |
| `bookings` | gebuchte Termine, inklusive Spiegelung im externen Kalender |
| `booking_invites` | persönliche Buchungslinks (nur als Abdruck) |

Zusätzlich: `job_candidates.next_interview_at` für Listenansichten.
