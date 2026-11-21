# 039 Revy: Datenschicht, Protokoll, Kontingent, Cache

Gehört zu Revy, Etappe 1. Plan und Begründungen: `docs/revy/PLAN.md`.

Voraussetzungen: 035 (`current_workspace()`) und 036 (`job_visible()`,
`candidate_visible()`). Die Migration ist additiv und kann mehrfach laufen.

## Was sie anlegt

**Pseudonym pro Kandidat.** `candidates.revy_ref`, etwa `K-3F9A1C07`. Wird
für bestehende Kandidaten befüllt, ist danach Pflicht und eindeutig. Revy und
das Modell sehen nur dieses Kürzel. Den Namen setzt erst die Oberfläche im
Browser ein, über die normale RLS.

**Seitentext der Unterlagen.** `candidate_document_pages` hält den Text von
Lebenslauf und Anschreiben pro Seite, damit Belegstellen eine Seitenzahl
haben. Der Server füllt die Tabelle beim ersten Bedarf aus dem privaten
Storage. Lesen nur im eigenen Mandanten und nur für sichtbare Kandidaten.

**Schema `revy` mit drei Sichten.** Revy liest ausschließlich hier.

| Sicht | Inhalt | Fehlt bewusst |
| --- | --- | --- |
| `revy.candidates` | Pseudonym, Stadt, Position, Jahre, Stufe, Skills, Ausbildung ohne Jahreszahl, bereinigtes Dossier | Name, E-Mail, Telefon, Adresse, Foto, Zusammenfassung, Lücken, Firmennamen |
| `revy.jobs` | Titel, Ort, Anstellung, Anforderungen, Beschreibung | Firma, Ersteller |
| `revy.applications` | Status, Score, Konfidenz und Belege je Kategorie, K.O. | Begründungstexte des Modells |

Alle drei sind `security_invoker`: Es gilt die RLS der Grundtabellen mit der
Sitzung des angemeldeten Nutzers. Mandantentrennung und private Stellen im
Team greifen also wie überall sonst.

Bereinigt wird in der Datenbank, nicht im Prompt:

- `revy.scrub` entfernt Sätze mit Alter, Geburt, Familienstand, Kindern,
  Elternzeit, Schwangerschaft, Religion, Staatsangehörigkeit, Herkunft,
  Behinderung, Gesundheit, Geschlecht und sexueller Orientierung, deutsch
  und englisch.
- `revy.scrub_contact` ersetzt E-Mail, Links, Telefonnummern, Daten mit Tag,
  Straßen mit Hausnummer und Postleitzahlen.
- `revy.neutral` setzt Berufsbezeichnungen in eine neutrale Form und
  entfernt Anreden.
- Muttersprache und verhandlungssicher werden zu einer Stufe
  zusammengelegt, weil Muttersprache auf Herkunft schließen lässt.

**Belegstellen.** `revy.belege(ref, begriffe)` liefert höchstens acht
Ausschnitte mit Dokument und Seite, pro Seite höchstens einen. Namensteile
werden zu `[Name]`, danach laufen dieselben Bereinigungen wie oben. Für ein
fremdes Pseudonym kommt nichts zurück.

**Datenstand.** `revy.datenstand(stelle)` ist ein Fingerabdruck über
Bewerbungen, Kandidaten und Stellen im Sichtbereich. Der Revy-Cache gilt nur,
solange er gleich bleibt.

**Tabellen.**

| Tabelle | Zweck | Schreiben | Ändern/Löschen |
| --- | --- | --- | --- |
| `revy_runs` | Ein Befehl mit Plan, Status und Ergebnis | Server | Server |
| `revy_audit` | Protokoll für die KI-Verordnung | Server | gesperrt |
| `revy_blocked_requests` | Nur Kategorie und Zeit gesperrter Anfragen | Server | gesperrt |
| `revy_incidents` | Anweisungen in Unterlagen, ungeplante Aktionen | Server | gesperrt |
| `revy_usage` | Anfragen pro Monat | über `revy_consume_request` | Server |
| `revy_cache` | Antworten für gleiche Befehle auf gleichem Datenstand | Server | Server |

„Gesperrt“ heißt: ein Trigger lehnt `update` und `delete` ab, auch für die
Service-Rolle. Nutzer lesen Läufe, Protokoll, Sperren und Vorfälle ihres
Mandanten, schreiben aber nichts.

`revy_consume_request(owner, limit)` zählt eine Anfrage im laufenden Monat
(Zeitzone Europe/Berlin) und gibt `allowed: false` zurück, wenn das Limit
erreicht ist. `null` heißt unbegrenzt. Nur die Service-Rolle darf sie
aufrufen.

## Prüfen

Lokal gegen eine leere Postgres-Datenbank, nie gegen Produktion:

```bash
REVY_TEST_PG="host=/home/pgtest port=55432 user=postgres" pnpm vitest run tests/revy-db.test.ts
```

Der Test baut `revetly_test` aus allen Migrationen neu auf (`tests/db/setup-db.sh`),
lädt `tests/db/revy-seed.sql` und prüft Mandantentrennung, private Stellen im
Team, fehlende Spalten, bereinigte Inhalte, das Protokoll nur zum Anhängen
und das Kontingent. Ohne `REVY_TEST_PG` wird er übersprungen.

Nach dem Einspielen in Supabase kurz im SQL-Editor:

```sql
select count(*) filter (where revy_ref is null) as ohne_ref from public.candidates;  -- 0
select table_name from information_schema.views where table_schema = 'revy';         -- 3 Sichten
```

## Zurück

```sql
drop schema if exists revy cascade;
drop table if exists public.revy_cache, public.revy_usage, public.revy_incidents,
  public.revy_blocked_requests, public.revy_audit, public.revy_runs,
  public.candidate_document_pages;
drop function if exists public.revy_consume_request(uuid, integer), public.revy_append_only();
alter table public.candidates drop column if exists revy_ref;
```

Das Protokoll geht dabei verloren. Vorher exportieren.
