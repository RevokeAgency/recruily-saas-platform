# 042 Revy, Etappe 4: Terminvorschläge

Voraussetzung: 025, 039, 040 und 041. Additiv, kann mehrfach laufen.
Abnahme: `docs/revy/ETAPPE-4.md`.

## Was sie ändert

| Teil | Zweck |
| --- | --- |
| `revy_batches.art` | Neue Art `termin` neben `absage` und `einladung`. |
| `revy_batches.meeting_type_id` | Terminart, mit der der Vorschlag angelegt wurde. Fehlt sie, nimmt der Versand die Standard-Terminart. |
| `revy_deliveries.booking_invite_id` | Der Buchungslink, den der Versand angelegt hat. |

Der Buchungslink selbst entsteht erst beim Versand auf dem Server, wie bei
einer Einladung von Hand über die Bewerbung. Gespeichert wird nur sein Hash in
`booking_invites`.

## Prüfen

```bash
REVY_TEST_PG="host=/home/pgtest port=55432 user=postgres" pnpm vitest run tests/revy-db.test.ts
```

## Zurück

```sql
delete from public.revy_batches where art = 'termin';
alter table public.revy_deliveries drop column if exists booking_invite_id;
alter table public.revy_batches drop column if exists meeting_type_id;
alter table public.revy_batches drop constraint if exists revy_batches_art_check;
alter table public.revy_batches add constraint revy_batches_art_check check (art in ('absage', 'einladung'));
revoke select on public.revy_batches from authenticated;
grant select (id, user_id, actor_id, run_id, art, stelle_id, ton, zusatz, status, freigegeben_durch, freigegeben_am, created_at, updated_at)
  on public.revy_batches to authenticated;
```

Bereits verschickte Buchungslinks bleiben gültig und stehen weiter unter
Termine.
