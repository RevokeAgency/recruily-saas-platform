# 029 · Produkt auf Positionierung v2

Bringt das Produkt auf den Stand, den Landing Page, FAQ, Datenschutzerklärung
und AGB seit Positionierung v2 zusagen. **Nicht automatisch ausführen.** Im
Supabase-SQL-Editor einspielen, additiv und idempotent. Setzt 028 nicht
voraus, die Reihenfolge der beiden ist egal.

Voraussetzungen: 003, 019, 020, 021, 022, 023.

## A · „Das Gespräch zählt mit"

Zusage: *„Pro Antwort vergibst du 1 bis 5 Punkte, und das Ergebnis fließt in
den Match ein."* Bis jetzt stimmte das nicht: `interview_score` stand getrennt
neben `match_score` und veränderte ihn nie.

**Zwei Werte statt einem.** `screening_score` ist neu und hält den reinen
Analysewert der Revetly Match Analyse. `match_score` ist der Match, den Nutzer
sehen: ohne Gespräch gleich dem Analysewert, mit Gespräch

```
Match = Analyse × 0,6 + Gespräch × 0,4
```

**Warum 40 Prozent.** Strukturierte Interviews sagen Berufserfolg nach der
Forschungslage mindestens so gut vorher wie die Auswertung von Unterlagen,
und der Bestenvergleich gewichtet gemessene Interviewergebnisse schon heute
stärker als reine Screening-Werte. Ganz überstimmen soll das Gespräch die
Analyse trotzdem nicht: Ein einzelnes Gespräch ist eine Stichprobe. Das
Gewicht steht an zwei Stellen und muss dort gleich bleiben:
`interview_weight()` in dieser Migration und `INTERVIEW_WEIGHT` in
`lib/matching/screening.ts`.

**Zwei Sperren**, damit ein gutes Gespräch keine harte Anforderung wegrechnet:

- Die Qualifikationssperre deckelt auch den gemischten Wert
  (`match_detail.zulassungsSperre.cap`).
- Bei K.O. kann das Gespräch den Match nur senken, nie heben. Das greift auch
  dort, wo `match_detail` fehlt, etwa bei Kandidaten, die über die direkte
  Anlage bewertet wurden.

**Warum ein Trigger.** Mehrere Stellen im Code schreiben `match_score`
(Scoring-Pipeline, direkte Kandidatenanlage, manuelle Zuordnung). Ein Trigger
sorgt dafür, dass keine davon die Mischung vergisst. Die beiden Pipeline-Stellen
schreiben `screening_score` zusätzlich ausdrücklich, damit auch der Zufall
richtig ausgeht, dass ein neuer Analysewert genau dem alten Mischwert
entspricht.

**Wer den reinen Analysewert liest.** Kalibrierung, Qualitätsprüfung und
Bestenvergleich messen oder vergleichen die Analyse selbst. Sie lesen
`screening_score`, sonst zählte das Gespräch doppelt.

Bestehende Bewerber mit gewertetem Gespräch werden beim Einspielen einmal neu
gerechnet.

## B · „Revetly lernt nur für dein Konto, nur mit deiner Zustimmung"

Bis jetzt stimmte die Zusage in beide Richtungen nicht:

- Die **Kalibrierung pro Konto** lief nachts für alle Konten, ohne Einwilligung.
- Das **Modelltraining** hatte eine Einwilligung, trainierte aber ein
  gemeinsames Modell über alle Kunden.

Jetzt:

| | vorher | jetzt |
|---|---|---|
| Kalibrierung pro Konto | alle Konten, ohne Einwilligung | nur mit Einwilligung in Fassung `2026-09-v2` |
| Angepasste Gewichte wirken | alle Pläne | nur Pro und Enterprise (Preistabelle: „Gewichtung lernt mit") |
| Widerruf | löschte Trainingsbeispiele | löscht zusätzlich Gewichte und Bericht, sofort |
| Gemeinsames Modelltraining | mit Einwilligung | abgeschaltet (`AI_SHARED_TRAINING`, Standard aus) |

Der Code-Teil dazu liegt in `lib/training/consent.ts`, im nächtlichen Cron,
in `lib/scoring.ts` (prüft vor jeder Bewertung, ob Gewichte wirken dürfen,
damit ein Widerruf oder Planwechsel nicht bis zur nächsten Nacht nachwirkt)
und im Einwilligungsschalter der Einstellungen.

**Alte Zustimmungen gelten nicht weiter.** Die Fassung `2026-08-v1` betraf
ein gemeinsames Modell, also einen anderen Zweck. Eine Einwilligung ist an
ihren Zweck gebunden. Die Migration löscht deshalb alles, was ohne gültige
Zustimmung zur aktuellen Fassung gelernt wurde, und der Schalter in den
Einstellungen bittet betroffene Konten um eine neue Zustimmung.

## Optional: gesammelte Beispiele löschen

Am Ende der Migration steht auskommentiert
`delete from public.ai_training_examples;`. Die dort gesammelten,
pseudonymisierten Beispiele gehörten zum gemeinsamen Modell und werden nicht
mehr genutzt. Fällt dieser Zweck endgültig weg, sollten sie gelöscht werden
(Speicherbegrenzung, Art. 5 Abs. 1 lit. e DSGVO). Das lässt sich nicht
rückgängig machen, deshalb ist es deine Entscheidung beim Einspielen.

## Getestet

Gegen eine lokale Postgres-16-Instanz mit dem Tabellenstand nach 003 bis 023,
16 Prüfungen, zweiter Lauf idempotent: Mischung, Neubewertung mit und ohne
ausdrücklichen Analysewert, Deckel der Qualifikationssperre, K.O. senkt aber
hebt nie, Entfernen des Gesprächs, Bereinigung alter Zustimmungen und
sofortige Löschung beim Widerruf.

## Nach dem Einspielen prüfen

1. Bewerber mit Gespräch öffnen: Unter dem Score steht die Zusammensetzung.
2. Gespräch neu bewerten: Der Match ändert sich.
3. In den Einstellungen zustimmen, dann widerrufen: Gewichte sind weg.
4. `/api/training/export` antwortet mit 403.
