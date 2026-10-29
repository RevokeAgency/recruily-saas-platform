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

Mail an alle bestätigten Adressen, jede mit eigenem Austragelink
(`unsubscribeUrl(id)` aus `lib/waitlist/store.ts`). Danach die Tabelle leeren,
so steht es in der Datenschutzerklärung (Abschnitt 8):

```sql
delete from public.waitlist;
```
