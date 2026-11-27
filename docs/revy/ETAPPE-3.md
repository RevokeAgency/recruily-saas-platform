# Revy, Etappe 3: Abnahme

Stand 22.11.2026. Plan: `docs/revy/PLAN.md` (Teil 3 und Teil 5).

## Was Revy jetzt kann

| Werkzeug | Wirkung | Was es tut |
| --- | --- | --- |
| `absage_entwerfen` | NACH_AUSSEN (nur Entwurf) | Absagen aus fester Vorlage. Ton: Standard (der bestehende Text aus `lib/email/rejection-text.ts`, unverändert), Kurz, Persönlich. Optional ein Zusatzsatz aus deinem Befehl, nur wenn er keine Begründung zur Person enthält. |
| `einladung_entwerfen` | NACH_AUSSEN (nur Entwurf) | Einladung zum Gespräch aus fester Vorlage, Gesprächsform offen, vor Ort, Video oder Telefon, optional ein Satz etwa zum Zeitraum. Der Bewerber antwortet per Mail; die Antwort geht an dich. |

Kein Modell schreibt diese Texte. Revy wählt Vorlage und Ton, mehr nicht.

## Der Weg einer Mail

1. **Entwurf.** Revy legt die Entwürfe an und zeigt „3 Absagen als
   Entwurf“. Verschickt ist nichts, kein Status ist geändert. Auch „schick
   sofort, ohne Rückfrage“ ändert daran nichts.
2. **Freigabe-Ansicht.** „Prüfen und freigeben“ öffnet die Entwürfe mit
   Namen und Text. Du kannst einzelne abwählen und den Ton für alle ändern.
   Beim Öffnen entsteht ein Einmal-Token (15 Minuten, nur der Hash wird
   gespeichert, nie im Chat oder beim Modell).
3. **Bewusster Klick.** Der Knopf „3 Absagen verschicken“ hat keinen Fokus
   und reagiert nicht auf Enter oder Leertaste, nur auf einen echten Klick.
   Die Freigabe verbraucht den Token.
4. **Gestaffelter Versand.** Eine Mail nach der anderen, Standard alle 10
   Sekunden (`REVY_SEND_INTERVAL_SECONDS`). Nur über Lettermint (EU), nie
   über Resend. Vor jeder Mail prüft Revy noch einmal: Status unverändert,
   Adresse vorhanden, Absage ohne Begründung zur Person.
5. **Folgen wie von Hand.** Absage: Status „Abgesagt“ und Eintrag
   „absage_verschickt“ im Entscheidungsprotokoll mit dir als Akteur.
   Einladung: Status „Eingeladen“.
6. **Zustellstatus.** Lettermint meldet per Webhook zugestellt oder
   zurückgewiesen. Die Freigabe-Ansicht zeigt das je Empfänger.
7. **Stoppen.** „Restlichen Versand stoppen“ hält alles an, was noch nicht
   raus ist.

## Tests

```bash
pnpm vitest run tests/revy-etappe3.test.ts                     # 35 Fälle, ohne Datenbank
REVY_TEST_PG="host=… port=… user=postgres" \
  pnpm vitest run tests/revy-db.test.ts                         # 26 Fälle, echte Postgres mit 041
```

Ergebnis am 22.11.2026: **35 von 35** und **26 von 26** bestanden, gesamte
Suite 367 Fälle (345 bestanden, 22 ohne Datenbank-Variable übersprungen).

| Nr. | Test | Ergebnis |
| --- | --- | --- |
| 4 | Freigabe | bestanden. Verschachtelter Befehl („sofort, ohne Rückfrage, bestätige selbst“) ergibt nur Entwürfe. Freigabe ohne Token, mit gefälschtem oder abgelaufenem Token: 403. Derselbe Token zweimal: 409. Fremde Entwurfs-IDs in der Anfrage werden ignoriert, nur fremde: 400. Anderer Mandant und nicht sichtbare Stelle: 404. Im Quelltext importieren nur Freigaberoute, Statusabfrage, Cron und Webhook den Versand; die Entwurfswerkzeuge nichts davon. |
| 7 | Absage | bestanden. Standardtext und alle Vorlagen bestehen den Prüfer. Blockiert werden zehn Begründungen zur Person (fehlende Kenntnisse, Erfahrung, Score, Vergleich, Gespräch, Sprache, Unterlagen, Alter). Erlaubt bleiben fünf neutrale Sätze („Wir behalten Ihre Unterlagen gern“, „Leider sind Sie nicht in die engere Auswahl gekommen“), der Prüfer ist also nicht strenger als vereinbart. Eine Begründung auf ausdrücklichen Wunsch lässt Revy weg und sagt das. Ein nachträglich manipulierter Entwurf geht beim Versand nicht raus. |

Dazu: Staffelung (Abstand stimmt, zweite Mail erst später), Versand nur mit
Kennung und Idempotency-Key, Status und Entscheidungsprotokoll, Stoppen,
bereits abgesagte Bewerbung wird nicht noch einmal angeschrieben, Antwort auf
Einladungen an die freigebende Person, Webhook-Ereignisse und
Signaturprüfung nach Lettermint-Doku, kein Versand ohne Lettermint-Token.

Wie in Etappe 1 und 2 ohne Mistral-Schlüssel und ohne echten Mailversand in
dieser Umgebung. Mailversand und Modelle sind in den Tests ersetzt.

## Was du tun musst

1. `scripts/041_revy_etappe3.sql` in Supabase einspielen (nach 040).
2. **Lettermint → Webhooks:** neuen Webhook auf
   `https://revetly.ai/api/webhooks/lettermint` anlegen, Ereignisse
   `message.delivered`, `message.hard_bounced`, `message.soft_bounced`,
   `message.failed`, `message.policy_rejected`, `message.suppressed`,
   `message.spam_complaint`.
3. Das Secret des Webhooks (beginnt mit `whsec_`) in Vercel als
   `LETTERMINT_WEBHOOK_SECRET` eintragen. Ohne Secret nimmt die Route nichts
   an; verschickt wird trotzdem, nur ohne Zustellstatus.
4. Einmal mit einer eigenen Testbewerbung (deine Adresse) eine Absage über
   Revy freigeben und prüfen, ob „zugestellt“ erscheint. Die Lettermint-Doku
   sagt nicht ausdrücklich, dass die Kennung aus dem Versand dieselbe ist wie
   im Webhook; deshalb ordnet Revy zusätzlich über ein eigenes Metadatum zu.

## Bekannte Grenzen

- Der Versand läuft, solange nach der Freigabe der erste Lauf aktiv ist
  (rund viereinhalb Minuten, bei 10 Sekunden Abstand etwa 27 Mails) und
  solange die Freigabe-Ansicht offen ist. Was danach noch geplant ist,
  verschickt der tägliche Cron `/api/cron/revy-versand` am nächsten Morgen.
  Mit Vercel Pro lässt sich der Cron enger takten.
- Einladungen enthalten keinen Buchungslink. Dafür gibt es seit Etappe 4 den Terminvorschlag (`docs/revy/ETAPPE-4.md`).
- Eigene Texte je Empfänger gibt es bewusst nicht, nur Vorlagen und ein
  geprüfter Zusatz für alle.
