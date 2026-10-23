# Assets der Dashboard-Vorschau

Quelle: https://raw.githack.com/RevokeAgency/recruily-saas-platform/preview/dashboard-html/dashboard-preview.html
(statischer Schnappschuss von `/dev/dashboard-preview` mit **erfundenen Beispieldaten**, laut README des
Branches `preview/dashboard-html`). Aufgenommen mit Playwright, Chromium, 1440 × 900 bzw. 1440 × 1800,
deviceScaleFactor 2, von `scripts/capture-dashboard.mjs`. Rechtecke aller Teile in `dashboard.json`.

## Marke
| | |
|---|---|
| Logo | `logo.png` (eingebettetes PNG aus der Kopfzeile, Positiv-Version) |
| Farben (CSS-Variablen) | `--primary` / `--rv-green` #16c77c, `--rv-cyan` #22c1ee, `--rv-ink` / `--foreground` #0c1a16, `--background` #f5f6f8, `--card` #fff, `--muted` #f1f3f5, `--accent` #e7f6fc, `--chart-1` #22c1ee, `--chart-2` #16c77c |
| Schrift | Plus Jakarta Sans (eingebettet), durchgehend |

## Bildschirme
| Datei | Was |
|---|---|
| `viewport.png` | erster Bildschirm (Kopfzeile, Begrüßung, Kennzahlen, Status, Buttons, erste Kartenreihe) |
| `full.png` | ganzes Dashboard |

## Bauteile des ersten Bildschirms (`parts/`)
`logo`, `nav` (Navigation), `actions` (Kontingent 184/300, Hilfe, Glocke, Avatar), `headline` („Willkommen zurück, Lisa"),
`kpis` (4 Aktive Jobs · 137 Kandidaten · 118 Bewertet), `status` (Bewertet 54 % · Eingeladen 17 % · Wartend 7 % · Abgesagt 23 %),
`buttons` („Kandidaten hochladen", „Neuen Job erstellen")

## Karten
| Datei | Was |
|---|---|
| `card-score.png` | Ø Match-Score 71 % (Ring) |
| `card-quota.png` | Matching-Kontingent 116 von 300 übrig |
| `card-prio.png` | Prioritäten (3 Interviews auszuwerten, 5 in Analyse, 2 nicht zugeordnet) |
| `card-recent.png` | Letzte Bewerbungen mit Score und Quelle (Public Page, E-Mail, Manuell) |
| `card-top.png` | Top-Kandidaten 1–5 (91 %, 88 %, 84 %, 81 %, 77 %) |
| `card-kpi.png` | Recruiting-Kennzahlen (18 Bewerbungen/Woche, Einladungsquote 18 %, Ø 2.4 Tage bis Einladung) |
| `card-quality.png` | Match-Qualität: **3.4× häufiger eingeladen bei Score 80+ als bei unter 60** |
| `card-activity.png` | Letzte Aktivitäten (Stellen mit Kandidatenzahl) |

## Echte Hover-Zustände (`hover/`)
Maus über dem Element, Karte neu aufgenommen: `top-1` (Platz 1 Jonas Leitner), `prio-1` (3 Interviews auszuwerten),
`recent-5` (David Brunner, gerade eben), `activity-1` (Kfz-Mechatroniker:in), Buttons `btn-upload` und `btn-job`
jeweils Ruhe und Hover.

Hinweis: Die Seite ist ein Schnappschuss ohne JavaScript. Es gibt keine eigenen Animationen
(Zähler o. Ä.); echte Zustände sind die CSS-Hover der Zeilen und Buttons.
