# 037 · Warteliste vor dem Start

**Nicht automatisch ausführen.** Im Supabase-SQL-Editor einspielen. Unabhängig
von 035 und 036, additiv und idempotent.

Lokal gegen Postgres 16 getestet: zweimal hintereinander fehlerfrei,
`service_role` liest und schreibt, `anon` und `authenticated` bekommen
„permission denied“, Großbuchstaben in der Adresse und doppelte Adressen
werden abgewiesen.

## Worum es geht

Solange `NEXT_PUBLIC_LAUNCH_MODE=waitlist` gesetzt ist, zeigt `www.revetly.ai`
eine Coming-Soon-Seite mit Eingabefeld (siehe `lib/launch.ts`). Wer sich
einträgt, bekommt einen Bestätigungslink (Double-Opt-in). Erst nach dem Klick
steht die Adresse auf der Liste.

## Tabelle `public.waitlist`

| Spalte | Inhalt |
| --- | --- |
| `email` | klein geschrieben, eindeutig |
| `status` | `pending` bis zur Bestätigung, dann `confirmed` |
| `confirm_token_hash` | SHA-256 des Bestätigungslinks, nie der Link selbst |
| `confirm_expires_at` | Ablauf des Links (7 Tage) |
| `consent_version` | Stand des Einwilligungstexts, Nachweis nach Art. 7 DSGVO |
| `source` | woher der Eintrag kam, z. B. `coming-soon` |
| `created_at`, `requested_at`, `confirmed_at` | Zeitpunkte |

- **Austragen löscht die Zeile.** Der Austragelink braucht keine Spalte, er ist
  aus der id signiert (`lib/waitlist/token.ts`, Schlüssel `WAITLIST_SECRET`).
- Unbestätigte Einträge löscht der Server, sobald ihr Link abgelaufen ist
  (beim nächsten Eintrag eines anderen Besuchers).
- RLS an, keine Policy, Rechte für `anon` und `authenticated` entzogen. Nur der
  Server liest und schreibt.

## Liste ansehen

```sql
select email, confirmed_at from public.waitlist
 where status = 'confirmed' order by confirmed_at;
```

## Zum Start

Alles läuft über die interne Seite **`/admin/warteliste`** (nur für Konten aus
`MONITORING_ADMIN_EMAIL`, alle anderen sehen ein 404):

1. **Testmail an mich** schicken und ansehen.
2. `NEXT_PUBLIC_LAUNCH_MODE` in Vercel entfernen und neu deployen. Vorher ist
   der Versand an alle gesperrt, weil „Jetzt starten“ sonst auf die
   Coming-Soon-Seite führt.
3. **An alle Bestätigten senden.** Geht in Paketen zu 25 Mails. Jede Adresse
   wird gelöscht, sobald Lettermint ihre Mail angenommen hat. Bricht der
   Versand ab (etwa Kontingent erreicht), einfach erneut starten: Wer noch in
   der Liste steht, hat die Mail noch nicht.
4. **Unbestätigte löschen.** Danach ist die Tabelle leer, wie in der
   Datenschutzerklärung (Abschnitt 8) zugesagt.

Optional `LETTERMINT_BROADCAST_ROUTE` setzen, wenn die Mail über eine eigene
Rundmail-Route bei Lettermint laufen soll. Vorher das Kontingent bei
Lettermint prüfen: Der Free-Plan hat 300 Mails im Monat.
