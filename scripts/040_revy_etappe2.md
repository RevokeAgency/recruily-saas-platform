# 040 Revy, Etappe 2: Tags, Änderungen, Korrekturen, Volltextsuche

Voraussetzung: 039 (und das Schema `revy` unter Exposed schemas). Additiv,
kann mehrfach laufen. Plan: `docs/revy/PLAN.md`, Abnahme:
`docs/revy/ETAPPE-2.md`.

## Was sie anlegt

| Teil | Zweck |
| --- | --- |
| `candidate_tags` | Tags pro Kandidat, optional an eine Stelle gebunden („Runde 2“). Lesen, Setzen und Löschen mit der Sitzung des Nutzers, nur für sichtbare Kandidaten und Stellen (RLS wie 036). |
| `revy.tags` | Sicht für Revy. Tags mit gesperrtem Merkmal („Kopftuch“) erscheinen dort nicht. |
| `revy_actions` | Jede Änderung von Revy mit vorher und nachher, Grundlage für die Rücknahme. Schreibt nur der Server. |
| `revy_corrections` | Widerspruch des Nutzers als Trainingsmaterial: Kategorie, Bewertung vorher und nachher, geschwärzte Belegstelle. Ohne Namen, Firmen, Volltext und Kürzel. Nur anhängen. |
| `revy.korrektur_text()` | Schwärzt die Belegstelle: Name, Firmen aus den Stationen, alles mit Rechtsform, Kontaktdaten, gesperrte Merkmale. Höchstens 300 Zeichen. |
| `revy.suche()` | Volltextsuche in Lebenslauf, Anschreiben und Seitentext. Gibt nur Kürzel und gefundene Begriffe zurück, nie Text. Begriffe mit gesperrten Merkmalen werden ignoriert. |
| `revy.blocked_pattern()` | ergänzt um Aussehen, Kopftuch und ähnliche Kleidung, Hautfarbe, Partei, Gewerkschaft. |
| `revy.datenstand()` | berücksichtigt Tags. |
| `revy_runs.status` | neu `wartet_auf_bestaetigung` (Revy fragt vor Änderungen an mehr als zehn Kandidaten). |

Notizen brauchen keine neue Tabelle: Revy hängt sie an das bestehende
Notizfeld der Bewerbung (`job_candidates.notes`), dort sieht man sie in der
Stelle wie jede andere Notiz.

## Prüfen

Lokal (nie gegen Produktion):

```bash
REVY_TEST_PG="host=/home/pgtest port=55432 user=postgres" pnpm vitest run tests/revy-db.test.ts
```

Nach dem Einspielen in Supabase: Revy öffnen. Fehlt noch etwas, zeigt das
Fenster oben einen gelben Hinweis mit dem fehlenden Schritt.

## Zurück

```sql
drop function if exists revy.suche(text[]), revy.korrektur_text(text, text);
drop view if exists revy.tags;
drop table if exists public.revy_corrections, public.revy_actions, public.candidate_tags;
```

`revy.blocked_pattern()` und `revy.datenstand()` stellt ein erneuter Lauf
von 039 wieder her. Korrekturen und Änderungsverlauf gehen beim Zurückgehen
verloren.
