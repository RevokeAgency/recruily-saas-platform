# IMLRS Eval-Harness

Damit keine Änderung an Prompts, Rubrik oder Gewichten mehr blind live geht.

## Ausführen

```bash
MISTRAL_API_KEY=... \
  node --experimental-strip-types scripts/eval/run-eval.mjs
```

Oder ohne lokalen Schlüssel in der laufenden App (angemeldet):
`/api/matching/eval`.

## Modellwechsel: Vorher-Nachher

`/api/matching/eval?vergleich=mistral-large-latest` rechnet jeden Fall mit
dem aktuellen und dem neuen Modell und gibt pro Fall beide Scores, die
Differenz und eine Empfehlung zurück. Fehler beim neuen Modell (meist ein
Rate-Limit, weil neue Modelle bei Mistral oft kleinere Kontingente haben)
führen zu „Nicht umstellen“. Reicht die Zeit nicht für alle Fälle, den Rest
mit `&case=<id>` nachholen.

Umstellen danach über die Variable `AI_MODEL_MATCHING` in Vercel (alle vier
Matching-Aufgaben auf einmal), lokal mit `--modell=<id>`.

Optionen:

| Flag | Wirkung |
|---|---|
| `--runs=3` | Jeden Fall 3× bewerten → misst die **Streuung** (Konsistenz) |
| `--case=<id>` | Nur einen Fall laufen lassen |
| `--json` | Maschinenlesbare Ausgabe (CI) |
| `--modell=<id>` | Alle Matching-Aufgaben mit diesem Modell |

Exit-Code `1`, wenn ein Fall außerhalb seines erwarteten Bandes liegt — direkt
als Gate in CI verwendbar.

## Wie man es liest

- **Score-Band statt Punktwert:** Erwartet wird ein Bereich (z. B. 78–100).
  Punktgenaue Erwartungen wären bei LLMs unehrlich; Bänder sind stabil.
- **Streuung:** Bei `--runs=3` sollte die Spanne desselben Falls **≤ 3 Punkte**
  liegen. Größere Werte heißen: die Pipeline ist wieder inkonsistent geworden
  (z. B. Temperatur, Rubrik zu vage, Belegpflicht aufgeweicht).
- **KO-Konsistenz:** Ein KO-Urteil muss über alle Läufe identisch sein.

## Golden-Set pflegen

`golden-set.json` erweitern — am wertvollsten sind **reale Grenzfälle, bei denen
ihr anderer Meinung wart als das System**. Pro Fall:

```jsonc
{
  "id": "kurzer-sprechender-name",
  "note": "Was dieser Fall absichern soll",
  "expect": { "minOverall": 60, "maxOverall": 95, "knockout": false },
  "candidate": { /* wie IMLRSCandidateInput, resume_text ist der wichtigste Teil */ },
  "job":       { /* wie IMLRSJobInput */ }
}
```

Faustregel: Nach jedem Kundenfeedback der Art „der Score war hier falsch" einen
Fall anlegen. So wird das Set mit der Zeit zur echten Qualitätssicherung.

## Kosten

Jeder Fall löst die volle Pipeline aus (Dossier + Richter + Prüfinstanz).
Das Set bewusst klein und aussagekräftig halten; `--runs` nur bei
Konsistenz-Prüfungen hochdrehen.
