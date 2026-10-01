# 032 · Gehalt auf der Stellenseite, Bewerberfotos privat

**Nicht automatisch ausführen.** Im Supabase-SQL-Editor einspielen, additiv
und idempotent. Voraussetzungen: 012 und 014. Unabhängig von 031, die
Reihenfolge der beiden ist egal.

## 1 · Gehalt auf der Stellenseite

In Österreich muss jede Stellenanzeige das Mindestentgelt nennen (§ 9 Abs. 2
Gleichbehandlungsgesetz, mit Hinweis auf Überzahlung). Das Formular hatte ein
Gehaltsfeld, die öffentliche Stellenseite hat es nie angezeigt.
`public_job_by_slug` liefert jetzt `salary_range` mit, dazu wie in 031
`created_at` und `updated_at`. Die Stellenseite zeigt das Gehalt als Chip,
Google for Jobs bekommt es als `baseSalary`, wenn es sich eindeutig lesen lässt.

## 2 · Bewerberfotos privat

Der Speicherbereich `candidate-photos` war öffentlich (014). Wer den Link zu
einem Foto hatte, konnte es ohne Anmeldung öffnen. Die Migration

- schaltet den Bereich auf privat,
- entfernt die Leserechte für alle,
- schreibt bestehende Adressen in `candidates.photo_url` auf die Route
  `/api/candidates/<id>/photo` um.

Die Route prüft, ob der Kandidat zum angemeldeten Konto gehört, und leitet auf
einen signierten Link weiter, der eine Stunde gilt. Die Oberfläche bleibt
unverändert, sie nutzt `photo_url` weiter als Bildadresse.

**Reihenfolge beim Ausrollen ist egal.** Der neue Code schreibt bereits die
Routen-Pfade, und signierte Links funktionieren auch, solange der Speicher
noch öffentlich ist. Alte, öffentliche Adressen funktionieren bis zur Migration
weiter und danach nicht mehr, deshalb schreibt sie die Migration um.
