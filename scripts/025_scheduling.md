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
ohne Abgleich mit dem echten Kalender.

### Pflicht, sobald ein Kalender verbunden werden soll

```
SCHEDULING_TOKEN_KEY=<openssl rand -base64 32>
```

Damit werden die OAuth-Tokens verschlüsselt (AES-256-GCM) und die
OAuth-`state`-Parameter signiert. Fehlt der Schlüssel, verweigert Revetly das
Speichern von Zugängen. Wird er getauscht, müssen alle Kalender neu verbunden
werden.

### Google Workspace

1. Google Cloud Console → neues Projekt → **Google Calendar API** aktivieren.
2. OAuth-Zustimmungsbildschirm anlegen (extern), Scopes eintragen:
   `calendar.events`, `calendar.readonly`, `openid`, `email`.
3. OAuth-Client-ID (Webanwendung) anlegen, autorisierte Weiterleitungs-URI:
   `https://revetly.ai/api/calendar/callback/google`
4. In Vercel setzen:
   ```
   GOOGLE_CALENDAR_CLIENT_ID=...
   GOOGLE_CALENDAR_CLIENT_SECRET=...
   ```

Google Meet-Links entstehen beim Anlegen des Termins über `conferenceData`,
ein weiterer Scope ist dafür nicht nötig.

### Microsoft 365

1. Entra ID (Azure AD) → App-Registrierungen → neue Registrierung,
   unterstützte Kontotypen: mehrere Mandanten.
2. Weiterleitungs-URI (Web):
   `https://revetly.ai/api/calendar/callback/microsoft`
3. API-Berechtigungen (delegiert): `Calendars.ReadWrite`, `offline_access`,
   `openid`, `email`.
4. Geheimer Clientschlüssel erzeugen, dann in Vercel setzen:
   ```
   MICROSOFT_CALENDAR_CLIENT_ID=...
   MICROSOFT_CALENDAR_CLIENT_SECRET=...
   MICROSOFT_CALENDAR_TENANT=common   # optional, Standard ist "common"
   ```

`offline_access` ist notwendig, sonst läuft die Verbindung nach einer Stunde
ab. Microsoft rotiert Refresh-Tokens bei jedem Erneuern, Revetly speichert den
jeweils neuen.

## Datenschutz

- Zugangstokens liegen verschlüsselt, der Client bekommt sie nie zu sehen.
- Buchungslinks werden nur als SHA-256-Abdruck gespeichert. Aus der Tabelle
  lässt sich kein gültiger Link bauen.
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
