# Revy, Etappe 4: Abnahme

Stand 27.11.2026. Plan: `docs/revy/PLAN.md` (Teil 3 und Teil 9).

## Was Revy jetzt kann

| Werkzeug | Wirkung | Was es tut |
| --- | --- | --- |
| `termin_vorschlagen` | NACH_AUSSEN (nur Entwurf) | Mail mit persönlichem Buchungslink. Der Bewerber wählt selbst einen freien Termin aus deinem Kalender. Terminart nach Wunsch („Zweitgespräch“), sonst deine Standard-Terminart. Optional ein Satz aus deinem Befehl. |
| `verfuegbarkeit_zeigen` | LESEND | Deine Wochenzeiten, Terminarten, verbundenen Kalender und die nächsten freien Termine. Ändern geht unter Termine, nicht über Revy. |

Beispiele:

- „Schick den drei besten einen Terminvorschlag“
- „Schick K-… einen Terminvorschlag fürs Zweitgespräch“
- „Wann habe ich nächste Woche Zeit?“

„Lad ein“ ohne Termin oder Link bleibt die Einladung aus Etappe 3, auf die
der Bewerber per Mail antwortet.

## Der Weg eines Terminvorschlags

1. **Entwurf.** Revy legt die Entwürfe an. Im Text stehen Terminart, Dauer
   und Ort, für den Link ein Platzhalter. Es gibt noch keinen Link.
2. **Freigabe-Ansicht.** Wie bei Absagen: prüfen, abwählen, bewusster
   Klick. Oben steht die Terminart und dass der Link deinen Kalender nutzt.
   Einen Ton gibt es nicht; Dauer und Ort kommen aus der Terminart.
3. **Nur wer angelegt hat, gibt frei.** Der Link zeigt die freien Zeiten aus
   dem Kalender der Person, die den Vorschlag angelegt hat. Kolleginnen und
   Kollegen sehen den Entwurf, können ihn aber nicht freigeben.
4. **Versand.** Erst jetzt entsteht der Buchungslink, genauso wie bei einer
   Einladung von Hand über die Bewerbung: 21 Tage gültig, gespeichert wird
   nur der Hash. Der Link steht nur in der Mail, nie im Chat, nie beim
   Modell, nie in den Revy-Tabellen.
5. **Folgen wie von Hand.** Status „Eingeladen“. Ältere offene Links zur
   selben Bewerbung werden nach dem Versand zurückgezogen. Scheitert der
   Versand, wird der neue Link zurückgezogen und der alte bleibt gültig.
6. **Buchung.** Bucht der Bewerber, läuft alles wie bisher: Bestätigung,
   Kalendereintrag, Termin an der Bewerbung, Übersicht unter Termine.

## Tests

```bash
pnpm vitest run tests/revy-etappe4.test.ts                     # 16 Fälle, ohne Datenbank
REVY_TEST_PG="host=… port=… user=postgres" \
  pnpm vitest run tests/revy-db.test.ts                         # 28 Fälle, echte Postgres mit 042
```

Ergebnis am 27.11.2026: **16 von 16** und **28 von 28** bestanden.

Geprüft wird unter anderem: Entwurf ohne Link und ohne Namen, Terminart aus
dem Befehl, unbekannte Terminart mit Hinweis, ohne Terminart die
Standard-Terminart, kein Ton, abgesagte Bewerbung ohne Vorschlag. Beim
Versand: Link erst nach der Freigabe, Hash passt zum Link in der Mail,
Klartext nirgends in der Datenbank, Antwort an dich, Status Eingeladen, alter
Link zurückgezogen; bei Fehler neuer Link zurückgezogen und alter gültig;
Kollegin kann nicht freigeben; ohne Terminbuchung im Plan kein Versand;
manipulierter Entwurf ohne Link-Platzhalter geht nicht raus. Bei den Zeiten:
Wochenzeiten in Worten, freie Termine ohne belegte, Zusammenfassung ohne
Modell, nichts im Cache.

## Was du tun musst

1. `scripts/042_revy_etappe4.sql` in Supabase einspielen (nach 041).
2. Unter Termine deine Wochenzeiten speichern und eine Terminart prüfen. Ohne
   gespeicherte Zeiten nimmt der Link die Standardzeiten und Revy sagt das.
3. Einmal mit einer eigenen Testbewerbung (deine Adresse) einen
   Terminvorschlag über Revy freigeben, den Link in der Mail öffnen und einen
   Termin buchen.

## Bekannte Grenzen

- Die Terminart im Text steht so, wie sie beim Anlegen des Entwurfs war.
  Änderst du sie danach unter Termine, gilt für den Link die neue.
- Freie Termine zeigt Revy für die nächsten 14 Tage (bis 30 auf Wunsch).
  Ist ein verbundener Kalender nicht erreichbar, sagt Revy das.
