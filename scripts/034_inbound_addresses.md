# 034 · Bewerbungsadressen im neuen Format

**Nicht automatisch ausführen.** Im Supabase-SQL-Editor einspielen, additiv
und idempotent. Voraussetzungen: 007 und 011.

Lokal gegen Postgres 16 getestet: zweimal hintereinander fehlerfrei,
Verfügbarkeitsprüfung, Speichern und Bestandsprüfung geprüft (siehe unten).

## Worum es geht

Bewerbungsadressen sehen jetzt so aus:

    kfz-mechatroniker-in@autohaus-berger.revetly.ai

Vor dem @ steht der Kurzname der Stelle (aus der Stellenseite, ohne „(m/w/d)“),
die Subdomain ist der Kurzname des Kunden. Vorher waren es über 80 Zeichen
mit Pluszeichen und Stellen-ID. Alte Adressen werden weiter erkannt.

Damit wird der Kurzname des Kunden zur Subdomain. Die Migration ergänzt dafür
zwei Regeln in `company_slug_status` und `save_company`:

1. **Reservierte Namen** wie `www`, `mail`, `app`, `api`, `jobs` sind keine
   Kurznamen. Wer sie wünscht, bekommt einen Vorschlag mit Laufnummer
   (`mail-2`). Die Liste steht gleich in `lib/email/routing.ts`; ein Test
   prüft, dass beide übereinstimmen.
2. **Höchstens 40 Zeichen**, an einem Bindestrich gekürzt.

## Nach dem Einspielen

Die Migration endet mit einer Abfrage, die nichts ändert. Sie listet Konten,
deren Kurzname reserviert oder zu lang ist. Vor dem Start sollte sie leer
sein. Steht dort ein Konto, den Kurznamen von Hand ändern. Achtung: Damit
ändern sich auch die Links seiner Stellenseiten.

## Geprüft

| Prüfung | Ergebnis |
| --- | --- |
| Zwei Läufe hintereinander | fehlerfrei |
| `company_slug_status('WWW')` | vergeben, Vorschlag `www-2` |
| `company_slug_status('Autohaus Berger GmbH')` | frei, `autohaus-berger-gmbh` |
| Sehr langer Firmenname | `die-allerbeste-kfz-werkstatt-im-ganzen` (an Bindestrich gekürzt) |
| `save_company('App Solutions', 'app')` | `app-2` |
| Bestandsprüfung mit Konto `mail` | Konto gemeldet, Grund „reserviert“ |
