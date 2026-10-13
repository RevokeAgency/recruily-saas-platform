# 035 · Teamzugänge

**Nicht automatisch ausführen.** Im Supabase-SQL-Editor einspielen, additiv
und idempotent. Voraussetzungen: 015, 028, 031, 033.

Lokal gegen Postgres 16 getestet: Migrationen 001 bis 035 nacheinander, 035
zweimal hintereinander fehlerfrei, Zugriffsregeln mit Inhaber, Mitglied und
fremdem Konto geprüft (siehe unten).

## Worum es geht

Mehrere Personen arbeiten in einem Konto. Das zahlende Konto ist der
**Arbeitsbereich**, alle Daten gehören wie bisher ihm (`user_id` = Inhaber).
Mitglieder stehen in `workspace_members` und sehen über
`current_workspace()` dieselben Stellen, Kandidaten, Protokolle und
Freigabe-Links. Bestehende Konten ändern sich nicht: Wer kein Mitglied ist,
ist sein eigener Arbeitsbereich.

| Plan | Nutzer inklusive | Weitere Nutzer |
| --- | --- | --- |
| Free | 1 | nicht möglich |
| Starter | 2 | höchstens 2, je 14,99 € pro Monat |
| Growth | 5 | je 14,99 € pro Monat (Schutzgrenze 50) |
| Pro, Enterprise | unbegrenzt | inklusive |

Rollen: **Inhaber** (Abo, Plätze, Team, Firma, Einwilligung zum Lernen) und
**Mitglied** (alles rund um Stellen und Kandidaten). Kalender,
Buchungsseiten und Benachrichtigungen bleiben pro Person.

## Was die Migration anlegt

1. `workspace_members` (eine Person ist höchstens in einem fremden Team) und
   `workspace_invites` (nur der SHA-256-Abdruck des Links, 14 Tage gültig).
   Beide Tabellen sind für Konten gesperrt, gelesen und geschrieben wird nur
   über die App mit service_role.
2. `user_profiles.extra_seats`, geschützt wie Plan und Kontingent: nur der
   Stripe-Webhook und die Platzbuchung setzen den Wert.
3. `current_workspace()` und `my_workspace()`.
4. `plan_seat_limit()`, `plan_extra_seat_max()` (Starter 2, Growth 50),
   `workspace_seat_limit()` und `enforce_seat_limit()`
   mit Triggern auf Profil und Mitgliedern. Sinkt das Limit (Downgrade,
   Kündigung), werden die zuletzt beigetretenen Mitglieder **gesperrt**
   statt gelöscht. Wird wieder ein Platz frei, sind sie in
   Beitrittsreihenfolge automatisch zurück.
5. Neue Policies für `jobs`, `candidates`, `job_candidates`,
   `inbound_emails`, `decision_events`, `review_links`,
   `review_link_items`: `user_id = (select current_workspace())` statt
   `user_id = auth.uid()`. Dazu Lesezugriff von Mitgliedern auf das Profil
   des Inhabers (Plan, Kontingent, Firma, Logo).
6. `consume_match`, `match_usage`, `job_quota`: Mitglieder dürfen das
   Kontingent ihres Teams lesen und verbrauchen. Sonst wortgleich zu 028,
   `tests/team.test.ts` prüft das.

## Lokaler Test

| Fall | Ergebnis |
| --- | --- |
| Mitglied liest Stellen des Inhabers | 1 Stelle |
| Mitglied legt Stelle für den Inhaber an | erlaubt |
| Mitglied verbraucht Match des Inhabers | erlaubt, 49 von 50 übrig |
| Mitglied liest `workspace_members` | verweigert |
| Mitglied ändert `extra_seats` | verweigert (`protected_profile_columns`) |
| Fremdes Konto liest Stellen | 0 |
| Fremdes Konto verbraucht Match des Inhabers | `forbidden` |
| Starter mit 2 Mitgliedern | 1 aktiv, 1 gesperrt |
| + 1 Zusatzplatz | beide aktiv |
| Starter mit 5 gebuchten Zusatzplätzen | Limit 4 (2 + höchstens 2) |
| Downgrade auf Free | beide gesperrt, sehen nichts mehr |
| Upgrade auf Pro | beide aktiv |
| Inhaber löscht Konto | Mitgliedschaften entfallen |

## Stripe

Nichts einzurichten. Beim ersten Zubuchen legt die App das Produkt
„Revetly Zusatznutzer“ mit zwei Preisen an (`revetly_seat_monthly`
14,99 €, `revetly_seat_yearly` 149,90 €, netto, Steuercode SaaS). Die
Plätze sind eine zweite Position im bestehenden Abo, im selben Intervall.
Mehr Plätze werden sofort anteilig berechnet, weniger als Gutschrift auf
die nächste Rechnung. Beim Wechsel auf Pro fallen sie weg, beim Wechsel
zwischen Starter und Growth gehen sie mit (zu Starter höchstens 2; wer
dabei Platz verliert, wird gesperrt, nicht gelöscht).

Im Kundenportal von Stripe lässt sich ein Abo mit zwei Positionen nicht
mehr umstellen, nur kündigen. Planwechsel laufen ohnehin über
`/subscription` (`/api/stripe/change-plan`), dort sind die Plätze
berücksichtigt.

## Ohne die Migration

Die App läuft unverändert weiter: `my_workspace` fehlt, jede Person ist ihr
eigener Arbeitsbereich. Die Team-Karte in den Einstellungen zeigt „wird
gerade eingerichtet“.
