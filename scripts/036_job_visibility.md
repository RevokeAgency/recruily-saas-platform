# 036 · Sichtbarkeit von Stellen im Team

**Nicht automatisch ausführen.** Im Supabase-SQL-Editor einspielen, **nach
035**, additiv und idempotent.

Lokal gegen Postgres 16 getestet: Migrationen 001 bis 036 nacheinander, 036
zweimal hintereinander fehlerfrei, Zugriffe mit Inhaber und zwei Mitgliedern
geprüft (siehe unten).

## Worum es geht

Entscheidung des Inhabers (16.10.2026): Jede Person sieht und verwaltet ihre
eigenen Stellen. Beim Anlegen lässt sich wählen, ob die Stelle **nur für
mich** oder fürs **ganze Team** ist. Vorausgewählt ist „Nur ich“.

| | Inhaber | Ersteller | anderes Mitglied |
| --- | --- | --- | --- |
| private Stelle | sieht, bearbeitet | sieht, bearbeitet | sieht nichts |
| Team-Stelle | sieht, bearbeitet | sieht, bearbeitet | sieht, bearbeitet |
| Sichtbarkeit ändern | ja | ja | nein |

Bewerber privater Stellen sind genauso geschützt: in der Kandidatenliste,
im Talent-Pool, im Entscheidungsprotokoll und bei Freigabe-Links. Ein
Bewerber, der auf mehrere Stellen passt, ist sichtbar, sobald eine davon
sichtbar ist.

Kontingent und Stellenlimit gelten weiter für das ganze Konto.

## Was die Migration anlegt

1. `jobs.created_by`, `jobs.visibility` (`private` oder `team`, Standard
   `private`), `candidates.created_by`. Bestand: Ersteller ist der Inhaber,
   alle bestehenden Stellen sind privat. Der Inhaber sieht sie wie bisher und
   kann sie einzeln fürs Team freigeben.
2. `job_visible()` und `candidate_visible()` für die Zugriffsregeln.
3. Trigger: `created_by` setzt die Datenbank beim Anlegen und ändert ihn nie;
   die Sichtbarkeit ändern nur Ersteller und Inhaber
   (`job_visibility_forbidden`).
4. Neue Policies für `jobs`, `job_candidates`, `candidates`,
   `decision_events`, `review_links`, `review_link_items`.
5. `my_workspace()` liefert zusätzlich die Zahl der Mitglieder; die
   Auswahl „Wer sieht die Stelle?“ erscheint nur, wenn es ein Team gibt.

## Lokaler Test

Inhaber O, Mitglieder A und B. A legt „Job A“ privat an, B „Job B“ fürs
Team, O „Job Inhaber“ privat.

| Fall | Ergebnis |
| --- | --- |
| A sieht | Job A, Job B |
| B sieht | Job B |
| O sieht | alle drei |
| B sieht Bewerber | nur die von Job B |
| B sieht Protokoll zu Job A | nichts |
| B hängt Bewerber an Job A | verweigert |
| A ändert Titel von Job B | erlaubt |
| A ändert Sichtbarkeit von Job B | verweigert |
| A ändert Ersteller | verweigert |
| B ändert Job A | 0 Zeilen |
| O gibt Job A fürs Team frei | erlaubt, B sieht danach Job A und dessen Bewerber |
| B verbraucht Match | erlaubt (Kontingent des Kontos) |

## Ohne die Migration

Die App läuft wie nach 035: Im Team sehen alle alle Stellen. Die Auswahl
erscheint nicht, gespeichert wird ohne Sichtbarkeit.
