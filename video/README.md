# Revetly Launch-Video (v2)

Remotion-Projekt, unabhängig von der App (eigene `package.json`, eigene Lockfile).
30 Sekunden, 30 fps, zwei Formate mit denselben Szenen und eigenem Bildausschnitt:

- `Launch-16x9`: 1920 × 1080
- `Launch-1x1`: 1080 × 1080

## Befehle

```bash
cd video
pnpm install
pnpm studio                       # Vorschau im Browser
pnpm check                        # Timing prüfen (Marker, Lücken > 2 s, SFX)
pnpm stills                       # Abnahme-Standbilder (1, 3, 5 … 28 s) → out/stills/
pnpm stills -- --at 12.5,13.2     # eigene Sekunden
pnpm render                       # beide MP4s → out/
pnpm audio                        # SFX und Platzhalter-Musik neu erzeugen
```

Ohne Chromium-Download: `BROWSER=/pfad/zu/chrome pnpm stills`, beim Rendern
`--browser-executable=/pfad/zu/chrome`.

## Aufbau

| Datei | Inhalt |
|---|---|
| `src/config/timing.ts` | **Alle Zeiten.** Akt-Marker, Cues, SFX-Einsätze, Musik-Slot, BPM, `snap()` |
| `src/config/copy.ts` | Alle Texte auf Bild |
| `src/config/theme.ts` | Farben, Schriften, Easings, Springs, Glow |
| `src/config/layout.ts` | Bildausschnitte pro Format |
| `src/data/mock.ts` | Die einzige Quelle für Beispieldaten (alles erfunden, Scores fix) |
| `src/stage/Stage.tsx` | Mesh, Color Grade, Korn, Vignette |
| `src/acts/` | Akt 1 Hook, Akt 2 Problem, Akt 3 Scan und Rangliste, Akt 4 Payoff und Logo |
| `src/ui/` | Produkt-UI, nachgebaut nach der App |
| `src/audio/Soundtrack.tsx` | Musik und SFX aus `timing.ts` |

Ebenen in jedem Bild, von unten nach oben: Mesh → Assets → Typo/Grafik → Color Grade → Korn + Vignette.

## Auf den Beat legen

In `src/config/timing.ts` die Werte in `MARKERS` (Sekunden) ändern. Alles, was an
einem Marker hängt, wandert mit: Bewegungen, Texte und Soundeffekte. `BPM` auf das
Tempo der Musik setzen; `snap(x)` legt einen Wert auf den nächsten Schlag.
Danach `pnpm check`: Das Skript meldet, wenn irgendwo mehr als 2 s ohne neues
Ereignis liegen.

## Ton

- `public/sfx/` enthält Whoosh, Klick, Thump, Tick und Chime, synthetisch aus `scripts/audio.mjs` (16-bit WAV).
- Musik: Platzhalter `public/music/platzhalter.wav` (Pad + Kick, 120 BPM), wird von
  `pnpm audio` erzeugt und nicht eingecheckt. Eigene Datei nach `public/music/` legen
  und in `MUSIC.src` eintragen.

## Logo

`assets-src/logo-negativ.webp` ist das gelieferte Negativ-Logo. `scripts/logo_parts.py`
zerlegt es in Badge, R-Bauteile und Buchstaben (`public/logo/`), daraus baut Akt 4 das
Logo auf. Nur bei einem neuen Logo erneut ausführen (Python mit Pillow und numpy).

## Herkunft der UI

Nachgebaut, nicht importiert (die App-Komponenten hängen an Next, Supabase und
CSS-Transitions):

- Listenzeile: `components/jobs/detail/candidates-tab.tsx`
- Score-Ring: `CircularProgress` in `candidate-match-modal.tsx`, Verlauf aus `components/dashboard/score-gauge.tsx`
- Kriterien, Gewichtungen, Begründung: Prüfprotokoll in `candidate-match-modal.tsx`
- Belegzitat: `components/candidates/document-findings.tsx`

Schriften: Plus Jakarta Sans aus der App, Montserrat (Fontsource), beide OFL.
