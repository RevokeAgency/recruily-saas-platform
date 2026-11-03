# 038 Ergebnis-Cache für das Matching

## Wozu

Dieselben Eingaben sollen immer denselben Score ergeben. Das Modell antwortet
auch mit Temperatur 0 und festem Seed nicht garantiert gleich. Ohne Cache
konnte „Neu matchen“ bei einer unveränderten Stelle andere Zahlen liefern als
vorher.

Mit dem Cache prüft das Matching vor dem ersten KI-Aufruf, ob es für genau
diese Eingaben schon ein Ergebnis gibt. Wenn ja, wird es übernommen. Das ist
schneller und kostet beim KI-Anbieter nichts.

## Was in den Fingerabdruck eingeht

Code: `lib/matching/cache.ts`.

- Lebenslauftext und Anschreiben, vereinheitlicht (Kleinschreibung, nur
  Buchstaben und Ziffern, wie bei der Dublettenprüfung)
- Kandidatenfelder: Name, Position, Skills, Jahre, Ausbildung, Ort,
  Zusammenfassung
- Stellenfelder: Titel, Firma, Muss- und Kann-Skills, Jahre, Ausbildung, Ort,
  Beschreibung, Sprachen, K.O.-Kriterien
- Gewichtung des Arbeitsbereichs (Standard oder kalibriert)
- Modelle je Aufgabe
- Wortlaut aller Prompts des Matchings
- `MATCH_LOGIC_VERSION` in `lib/matching/cache.ts`

Ändert sich etwas davon, wird neu gerechnet. Ändert jemand die Stelle, gilt
also automatisch der neue Stand. Wird ein Prompt angepasst, sind alle alten
Einträge ungültig, ohne dass jemand daran denken muss.

**Nach einer Änderung an der Berechnung selbst** (Gewichtung, Obergrenzen,
Zusammenrechnen der Kategorien) `MATCH_LOGIC_VERSION` um eins erhöhen. Diese
Änderungen sieht der Fingerabdruck sonst nicht.

## Was nicht in den Cache kommt

Ergebnisse, die nicht vollständig gelaufen sind:

- das Urteil kam vom Ersatzmodell statt vom ersten Modell der Kette
- die Prüfinstanz ist ausgefallen
- es gab kein Dossier

Sonst bliebe ein schwächeres Ergebnis dauerhaft hängen.

## Datenschutz

Die Zeile enthält dasselbe wie `job_candidates.match_detail`, also
Begründungen mit Bezug zum Lebenslauf. Sie hängt per `on delete cascade` am
Kandidaten, an der Stelle und am Konto. Jede Löschung (Kunde, 180-Tage-Frist,
Selbstlöschung, Kontolöschung) nimmt den Cache-Eintrag mit. Getrennt nach
Arbeitsbereich, nie zwischen Kunden geteilt.

## Prüfen nach dem Einspielen

```sql
select count(*), sum(hits) from public.match_cache;
```

Nach dem ersten Matching steht dort eine Zeile. Ein zweites „Neu matchen“
derselben Stelle erhöht `hits`, der Score bleibt gleich, und
`match_detail.cache` beim Kandidaten zeigt, von wann das Ergebnis stammt.
