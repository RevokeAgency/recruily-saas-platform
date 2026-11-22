# 041 Revy, Etappe 3: Entwürfe, Freigabe, Zustellungen

Voraussetzung: 039 und 040. Additiv, kann mehrfach laufen. Plan:
`docs/revy/PLAN.md`, Abnahme: `docs/revy/ETAPPE-3.md`.

## Was sie anlegt

| Teil | Zweck |
| --- | --- |
| `revy_batches` | Ein Stapel Absagen oder Einladungen für eine Stelle. Status `entwurf` → `freigegeben` → `versendet` (oder `abgebrochen`). Hält den Hash des Einmal-Tokens der Freigabe, 15 Minuten gültig. |
| `revy_drafts` | Ein Entwurf je Bewerbung. Text mit Platzhaltern (`{{name}}`, `{{stelle}}`, `{{firma}}`), keine Namen, keine Adressen. |
| `revy_deliveries` | Eine Zeile je verschickter Mail: geplant, in Versand, gesendet, zugestellt, zurückgewiesen, Fehler, gestoppt. Kennung von Lettermint für den Zustellstatus. |
| `revy.kontaktierbar()` | Hat ein Kandidat eine E-Mail-Adresse? Nur ja oder nein, nie die Adresse. |

Schreiben nur der Server. Nutzer lesen den eigenen Arbeitsbereich, die
Spalten mit dem Token-Hash aber nicht.

## Prüfen

```bash
REVY_TEST_PG="host=/home/pgtest port=55432 user=postgres" pnpm vitest run tests/revy-db.test.ts
```

## Zurück

```sql
drop function if exists revy.kontaktierbar(text[]);
drop table if exists public.revy_deliveries, public.revy_drafts, public.revy_batches;
```

Der Zustellverlauf geht dabei verloren. Verschickte Absagen stehen
weiterhin im Entscheidungsprotokoll (`decision_events`).
