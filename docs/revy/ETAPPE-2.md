# Revy, Etappe 2: Abnahme

Stand 21.11.2026. Plan: `docs/revy/PLAN.md` (Teil 3 und Teil 6).

## Warum Revy nach Etappe 1 so wenig fand

| Ursache | Jetzt |
| --- | --- |
| Gesucht wurde nur in der Skill-Liste, und jeder Begriff musste vorkommen. | Begriffe werden im ganzen bereinigten Profil (Position, Skills, Stationen, Ausbildung, Zertifikate) **und** im Text von Lebenslauf und Anschreiben gesucht. Treffer werden nach Anzahl sortiert, „alle Begriffe“ nur auf ausdrücklichen Wunsch. |
| Fehlende Berufsjahre zählten als 0, „mindestens fünf Jahre“ warf diese Leute raus. | Jahre aus dem Profil, sonst aus dem Dossier. Unbekannt bleibt drin und wird als „Jahre unbekannt“ markiert. |
| Der Statusfilter kannte „Eingeladen“, „Abgesagt“ und „Eingestellt“ nicht. | Status wie in der App: neu, bewertet, shortlist, eingeladen, eingestellt, abgesagt, wartet. |
| Ein technischer Fehler (039 fehlt, Schema nicht freigegeben) endete als „Dazu geben die Unterlagen nichts her.“ | Revy nennt den Fehler. Beim Öffnen prüft das Fenster die Einrichtung und zeigt fehlende Schritte gelb an. |
| Der Planer kannte die Anforderungen der Stelle nicht. | Er bekommt Titel, Muss- und Kann-Skills und Erfahrung der Stelle (keine Bewerberdaten) und Beispiele, wie er Suchbegriffe großzügig anlegt. |

Jeder Treffer zeigt jetzt, **wo** der Begriff steht: „SAP (Profil)“ oder
„Lagerlogistik (Unterlagen)“.

## Was Etappe 2 dazubringt

| Werkzeug | Wirkung | Was es tut |
| --- | --- | --- |
| `status_setzen` | INTERN | Shortlist oder zurück auf Bewertet. Absagen, Einladen und Einstellen kann Revy nicht. Laufende Analysen, Einladungen, Absagen und Einstellungen fasst Revy nicht an. |
| `tag_setzen`, `tag_entfernen` | INTERN | Tags pro Kandidat, optional nur für eine Stelle („Runde 2“). In der Suche filterbar. |
| `notiz_anlegen` | INTERN | Hängt eine datierte Notiz an die Bewerbung an, sichtbar in der Stelle. |
| `korrektur_melden` | INTERN | Widerspruch zu einer Einschätzung als Trainingsmaterial, ohne Namen, Firmen und Kürzel. Ändert keinen Score, nur zum Anhängen. |

- Jede Änderung steht mit vorher und nachher in `revy_actions` und lässt sich
  einzeln zurücknehmen: direkt in der Antwort oder unter **Änderungen** im
  Revy-Fenster. Zurück geht nur, solange niemand danach selbst geändert hat.
- Ändert ein Plan mehr als zehn Kandidaten, fragt Revy vorher und nennt die
  Zahl. Getrennt vom Abrechnungsdialog für Matches.
- Geschrieben wird mit der Sitzung des Nutzers: RLS entscheidet, was er ändern
  darf, und das Entscheidungsprotokoll (031) hält ihn als Akteur fest.
- Tags und Notizen mit gesperrten Merkmalen speichert Revy nicht.
- Änderungsläufe kommen nie aus dem Cache.

## Tests

```bash
pnpm vitest run tests/revy-agent.test.ts                       # 69 Fälle, ohne Datenbank
REVY_TEST_PG="host=… port=… user=postgres" \
  pnpm vitest run tests/revy-db.test.ts                         # 22 Fälle, echte Postgres mit 040
```

Ergebnis am 21.11.2026: **69 von 69** und **22 von 22** bestanden, gesamte
Suite 330 Fälle (308 bestanden, 22 ohne Datenbank-Variable übersprungen).

Neu geprüft, unter anderem:

- Suche findet Begriffe, die nur in den Unterlagen stehen; Sortierung nach
  Treffern; „alle“ nur auf Wunsch; unbekannte Jahre bleiben markiert drin;
  Status „eingeladen“ findet „Eingeladen“; gesperrter Suchbegriff wird nicht
  verwendet; ohne 040 sucht Revy im Profil und sagt das; technischer Fehler
  ergibt einen Hinweis statt „nichts her“.
- Status, Tag, Notiz: Änderung, Protokoll mit vorher und nachher, Rücknahme,
  doppelte Rücknahme abgelehnt, Rücknahme lässt eine spätere Änderung von Hand
  stehen; Absagen bleiben unberührt; „abgesagt“ ist als Ziel nicht erlaubt.
- Bestätigung ab elf Kandidaten, Freigabe im Protokoll, doppelter Klick führt
  nicht zweimal aus.
- Korrektur ohne Kürzel, Name und Firma, nicht rücknehmbar.
- Datenbank: Tags nur im eigenen Mandanten und für sichtbare Kandidaten
  (Teammitglied nicht für die private Stelle), Tags mit gesperrtem Merkmal
  erreichen Revy nicht, Volltext liefert nie Text und nichts von Mandant B,
  Korrekturen nur zum Anhängen, Nutzer schreiben nicht in `revy_actions` und
  `revy_corrections`, Datenstand ändert sich mit Tags.
- Quelltext: Werkzeuge lesen nur über `revy`, schreiben nur über die Sitzung
  in `job_candidates` und `candidate_tags`.

Wie in Etappe 1 ohne Mistral-Schlüssel in dieser Umgebung: Die Modelle sind
in den Tests ersetzt. Ob Mistral die neuen Werkzeuge so wählt, zeigt erst der
echte Lauf.

## Was du tun musst

1. `scripts/040_revy_etappe2.sql` in Supabase einspielen (nach 039).
2. Revy öffnen. Fehlt noch etwas, steht oben im Fenster ein gelber Hinweis
   mit dem fehlenden Schritt.

## Bekannte Grenzen

- Die Volltextsuche ist eine einfache Wortsuche (Teilwort, ohne Groß- und
  Kleinschreibung). Synonyme legt der Planer als zusätzliche Begriffe an.
- Lebensläufe ohne gespeicherten Text (`resume_text`) und ohne Seitentext
  findet die Volltextsuche erst, wenn einmal Belege für sie gesucht wurden
  oder das Matching den Text gespeichert hat.
- Korrekturen werden gespeichert, fließen aber noch in kein Training ein.
  Wenn sie genutzt werden, gilt die Einwilligung pro Konto
  (`lib/training/consent.ts`).
