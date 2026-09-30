# 031 · Startklar: Benachrichtigungen, Talent-Pool, Google for Jobs, Entscheidungsprotokoll

**Nicht automatisch ausführen.** Im Supabase-SQL-Editor einspielen, additiv
und idempotent. Voraussetzungen: 003, 012, 013, 015. Die Spalten aus 020, die
der Protokoll-Trigger liest, legt die Migration selbst an.

Lokal gegen Postgres 16 mit nachgebildeten Supabase-Rollen getestet: zweimal
hintereinander fehlerfrei, dazu Trigger, RLS und Rechte geprüft (siehe unten).

## 1 · Benachrichtigungen über neue Bewerbungen

`user_profiles.notify_applications_instant` (Standard an) und
`notify_applications_daily` (Standard aus). Gesetzt in den Einstellungen unter
„Benachrichtigungen“. Die Sofortmail geht nach der Analyse raus, die
Zusammenfassung täglich um 05:30 UTC (`/api/cron/application-digest`).
Ohne Migration gelten die Standards, abschalten lässt sich dann nichts.

## 2 · Talent-Pool nur mit Einwilligung

`candidates.talent_pool_consent` (Standard aus) und `talent_pool_consent_at`
als Nachweis. Gesetzt über die freiwillige Checkbox im Bewerbungsformular oder,
bei selbst angelegten Kandidaten, durch die Bestätigung des Recruiters.

**Folge:** Bestehende Kandidaten haben keine erfasste Einwilligung und
erscheinen nicht mehr in den Vorschlägen für neue Stellen. Bewerbungen per
E-Mail ebenfalls nicht, dort gibt es kein Formular. Manuell einer Stelle
zuordnen kann der Recruiter weiterhin, die Verantwortung liegt dann bei ihm.

## 3 · Google for Jobs

`public_job_by_slug` liefert zusätzlich `created_at` und `updated_at`. Google
verlangt das Veröffentlichungsdatum. Ohne diese Änderung zeigt die Stellenseite
keine strukturierten Daten.

## 4 · Entscheidungsprotokoll

Tabelle `decision_events`: wer hat wann was entschieden. Keine Namen oder
Kontaktdaten, deshalb bleibt ein Eintrag nach Löschung eines Kandidaten ohne
Personenbezug stehen.

- **Trigger** `z_log_job_candidate_decision` auf `job_candidates`: jeder
  Statuswechsel und jedes abgeschlossene Gespräch, mit `auth.uid()` als
  Handelndem. Ein Fehler beim Protokollieren verhindert die Änderung nie.
- **Server** schreibt: Stelle abgeschlossen, menschliche Prüfung bestätigt
  (mit Wortlaut), Absage verschickt.
- **Rechte:** Konten lesen und hängen an, nur für sich selbst und nur mit
  sich selbst als Handelndem. Ändern und löschen kann niemand außer
  `service_role`. Kein Zugriff für `anon`.
- **Export:** pro Stelle als CSV über „Protokoll“ im Stellen-Detail.

## Getestet

| Prüfung | Ergebnis |
| --- | --- |
| Zweimal hintereinander einspielen | fehlerfrei |
| Standardwerte Benachrichtigung und Einwilligung | an / aus / aus |
| Stellenabfrage liefert Datum | ja |
| Statuswechsel und Gespräch durch Nutzer A | zwei Einträge, Handelnder A |
| Reines Score-Update | kein Eintrag |
| Zeile ohne `user_id` | Update klappt, kein Eintrag |
| Nutzer B liest Einträge von A | 0 Zeilen |
| Nutzer B schreibt für A | abgelehnt (RLS) |
| A schreibt mit fremdem Handelnden | abgelehnt (RLS) |
| A ändert oder löscht | verweigert |
| `anon` liest | verweigert |
| Kandidat gelöscht | Einträge bleiben, Bezug entfernt |
