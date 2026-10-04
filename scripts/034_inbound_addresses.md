# 034 · Bewerbungsadressen im neuen Format

**Nicht automatisch ausführen.** Im Supabase-SQL-Editor einspielen, additiv
und idempotent. Voraussetzungen: 007 und 011.

Lokal gegen Postgres 16 getestet: zweimal hintereinander fehlerfrei,
Verfügbarkeitsprüfung, Speichern und Bestandsprüfung geprüft (siehe unten).

## Worum es geht

Bewerbungsadressen haben das Format `stelle@firma.revetly.ai`:

    kfz-mechatroniker@autohaus-berger.revetly.ai

**Stelle:** Jede Stelle bekommt beim Anlegen einen festen Adressnamen
(`jobs.inbound_alias`). Er besteht aus den ersten zwei aussagekräftigen
Wörtern des Titels und hat höchstens 28 Zeichen. Geschlechterzusatz
(„(m/w/d)“, „:in“), Seniorität („Senior“, „Junior“), Arbeitszeit und
Füllwörter fallen weg, Umlaute werden ausgeschrieben. Pro Firma ist der Name
eindeutig, bei Gleichstand mit Laufnummer:

| Titel | Adressname |
| --- | --- |
| Kfz-Mechatroniker:in (m/w/d) | `kfz-mechatroniker` |
| Senior Fachkraft für Lagerlogistik (m/w/d) | `fachkraft-lagerlogistik` |
| Mitarbeiter:in Kundenservice | `mitarbeiter-kundenservice` |
| Pflegefachkraft (DGKP) Teilzeit ab sofort | `pflegefachkraft-dgkp` |
| zweite Stelle „Kfz Mechatroniker (w/m/d)“ | `kfz-mechatroniker-2` |

Der Name bleibt fest, auch wenn der Titel später geändert wird. Konten
können ihn nicht direkt ändern (Trigger `protect_job_inbound_alias`).
Bestehende Stellen bekommen ihn beim Einspielen, die älteste zuerst.

**Firma:** Die Subdomain ist der Kurzname des Kunden. Der Vorschlag beim
Einrichten lässt die Rechtsform weg (`Autohaus Berger GmbH` →
`autohaus-berger`, `Huber Transporte e.U.` → `huber-transporte`).
Bestehende Kurznamen ändert die Migration nicht, weil an ihnen auch die
Links der Stellenseiten hängen. Zusätzlich gilt:

1. **Reservierte Namen** wie `www`, `mail`, `app`, `api`, `jobs` sind keine
   Kurznamen. Wer sie wünscht, bekommt einen Vorschlag mit Laufnummer
   (`mail-2`).
2. **Höchstens 40 Zeichen**, an einem Bindestrich gekürzt.

Alle Wortlisten (reserviert, Rechtsformen, Füllwörter) stehen gleich in
`lib/email/routing.ts`; Tests prüfen, dass App und Migration
übereinstimmen und dieselben Namen erzeugen.

Alte Adressen (mit Stellen-ID und Pluszeichen oder mit dem langen
Kurznamen der Stellenseite) werden weiter erkannt.

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
| Sehr langer Firmenname | an einem Bindestrich auf höchstens 40 Zeichen gekürzt |
| `save_company('App Solutions', 'app')` | `app-2` |
| Bestandsprüfung mit Konto `mail` | Konto gemeldet, Grund „reserviert“ |
| Zwei Bestandsstellen „Kfz-Mechatroniker“ | `kfz-mechatroniker`, `kfz-mechatroniker-2` |
| Neue Stelle über den Trigger | `kfz-mechatroniker-3`, `buchhalter` |
| Gleicher Name in einem anderen Konto | erlaubt |
| Konto ändert `inbound_alias` direkt | verweigert |
| Konto ändert den Titel | erlaubt, Adressname bleibt |
| 12 Titel und 7 Firmennamen, App gegen Datenbank | identisch |
