# 033 · Freigabe-Link für Fachabteilungen

**Nicht automatisch ausführen.** Im Supabase-SQL-Editor einspielen, additiv
und idempotent. Voraussetzungen: 003 (jobs), 013 (`job_candidates.user_id`),
015 (RLS).

Lokal gegen Postgres 16 mit nachgebildeten Supabase-Rollen getestet: zweimal
hintereinander fehlerfrei, dazu Prüfregeln, Rechte und Löschketten (siehe
unten).

## Was es macht

HR wählt bei einer Stelle bis zu zehn Bewerber aus und schickt sie per Link an
jemanden im eigenen Unternehmen (Werkstattleitung, Vertrieb). Die Person sieht
ohne Login Zusammenfassung, Match und Lebenslauf und sagt pro Bewerber
„Interessant“ oder „Ablehnen“, auf Wunsch mit Kommentar. Das Urteil ist nur
eine Rückmeldung an HR, es ändert keinen Status.

- `review_links`: ein Link pro Anfrage. Gespeichert wird nur der SHA-256-
  Abdruck des Links (`token_hash`), nie der Link selbst. Gültig 7 Tage,
  widerrufbar (`revoked_at`). `first_opened_at` und `completed_at` zeigen HR,
  ob der Link geöffnet und vollständig beantwortet wurde.
- `review_link_items`: die Bewerber im Link mit Urteil (`interessant` oder
  `ablehnen`), Kommentar und Zeitpunkt.

## Rechte

Konten lesen ihre eigenen Links und Urteile (RLS über `user_id`). Schreiben
dürfen sie nicht direkt: Anlegen, Urteilen und Widerrufen laufen über die App
mit `service_role`, damit Plan (ab Growth), Eigentum der Bewerbungen und
Ablauf an einer Stelle geprüft werden. `anon` hat keinen Zugriff.

## Löschen

- Bewerbung gelöscht oder Speicherfrist abgelaufen: Eintrag im Link geht mit.
- Stelle gelöscht: Link samt Einträgen geht mit.
- Konto gelöscht: alles geht mit. Datenexport enthält beide Tabellen, ohne den
  Abdruck des Links.

## Geprüft

| Prüfung | Ergebnis |
| --- | --- |
| Zwei Läufe hintereinander | fehlerfrei |
| Ungültiges Urteil („vielleicht“) | abgewiesen (Prüfregel) |
| Derselbe Bewerber zweimal im Link | abgewiesen (eindeutig) |
| Eigentümer liest Links und Einträge | 1 und 2 |
| Eigentümer schreibt direkt | verweigert |
| Fremdes Konto liest | 0 und 0 |
| `anon` liest | verweigert |
| Bewerbung löschen | Eintrag entfernt |
| Konto löschen | Link und Einträge entfernt |

Ohne diese Migration zeigt die App beim Anlegen „Freigabe-Links benötigen
Migration 033_review_links.sql“ und listet keine Links.
