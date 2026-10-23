# Revetly Videos

Remotion-Projekt mit eigener `package.json`. Zwei Videos, je 30 s bei 30 fps:

- **`RevetlyDemo`** (Haupt-Composition, 1920 × 1080): Produkt-Demo mit 3D-UI.
  Nutzt die echten UI-Komponenten der App (`components/ui/*`) und deren
  Tailwind-Tokens aus `app/globals.css`.
- **`Launch-16x9` / `Launch-1x1`** (Ordner „Launch-v2"): das abgenommene Launch-Video.

**Voraussetzung:** Weil die Demo Komponenten der App importiert, muss auch im
Repo-Root einmal `pnpm install` gelaufen sein (für clsx, tailwind-merge, Radix …).

## Showreel (20 s, 120 BPM)

`Showreel-9x16` (1080 × 1920), `Showreel-1x1`, `Showreel-16x9`: eine Zeitachse, drei
Layouts. Jede Szene wählt ihr Layout aus dem Seitenverhältnis (`src/showreel/kit.tsx`).

| Datei | Inhalt |
|---|---|
| `src/showreel/timing.ts` | **Alle Zeiten** im 120-BPM-Raster (`b(n)` = Schlag n), Texte, Kennzahl, SFX |
| `src/showreel/scenes/` | Hook, Assemble (Hero baut sich auf), Compare, Score, Interview, Metric, Lockup |
| `scripts/capture-anim.mjs` | nimmt die echten Animationen der Website Bild für Bild auf (Playwright-Uhr + CDP) |
| `scripts/showreel_prep.py` | schneidet die Aufnahmen aus `assets/` zu → `public/showreel/` |
| `scripts/showreel-audio.mjs` | Originalmusik, komplett synthetisiert, auf dem Raster von `timing.ts` |
| `scripts/contact-sheet.py` | Kontaktabzug: ein Bild pro Beat, alle drei Formate |

Die UI ist nirgends nachgezeichnet: Hero, Regler, Match-Analyse und Gesprächsleitfaden sind
Ausschnitte bzw. Bildfolgen der Website. Zähler, Balken und Bewertungen sind die echten
Animationen der Seite; abgeschaltet ist bei der Aufnahme nur das Einblenden (`.reveal`),
das übernimmt das Video.

```bash
pnpm showreel:assets   # neu aufnehmen und zuschneiden (braucht Zugriff auf die Website)
pnpm showreel:sheet    # Musik, Standbilder, out/showreel-contact-sheet.png
pnpm render:showreel   # alle drei Formate nach out/
```

## Dashboard-Showreel (20 s, 120 BPM)

`Dashreel-9x16`, `Dashreel-1x1`, `Dashreel-16x9`: dieselbe Struktur wie der Showreel, gebaut
aus der Dashboard-Vorschau (Branch `preview/dashboard-html`, erfundene Beispieldaten).
Bühne, Schnitte und Typo kommen aus `src/showreel/kit.tsx`.

| Datei | Inhalt |
|---|---|
| `src/dashreel/timing.ts` | Zeiten im selben Raster, Texte, Kennzahl, SFX |
| `src/dashreel/scenes/` | Hook, Assemble (Dashboard baut sich auf), Feature (Karte + echter Hover + Klick), Metric, Lockup |
| `scripts/capture-dashboard.mjs` | Aufnahme: erster Bildschirm, Bauteile, Karten, Hover-Zustände → `assets/dashboard/` |
| `scripts/dashreel_prep.py` | Zuschnitt, Zeilenstreifen, Masken → `public/showreel/dashboard/` |

Die Seite ist ein Schnappschuss ohne JavaScript; echte Aktionen sind ihre CSS-Hover-Zustände
(Zeilen, Button „Neuen Job erstellen"). Die Musik ist eine eigene Variante desselben
Synthesizers (`node scripts/showreel-audio.mjs dashboard`, d-Moll).

```bash
pnpm dashreel:assets   # neu aufnehmen und zuschneiden
pnpm dashreel:sheet    # Musik, Standbilder, out/dashreel-contact-sheet.png
pnpm render:dashreel   # alle drei Formate nach out/
```

## Produkt-Demo

| Datei | Inhalt |
|---|---|
| `src/Root.tsx` | Compositions |
| `src/components/DemoVideo.tsx` | Ebenen: Mesh → Szenen → Grade → Korn → Vignette, Ton |
| `src/components/scenes/` | Intro, Upload, Scoring, Outro |
| `src/components/app/` | App-UI: Hülle mit Topbar, Dropzone, Ergebnis-Karte, Dashboard, Detail-Sheet |
| `src/components/motion/` | `Tilt3D` (perspective/rotate), `KineticText`, `Cursor`, `countUp` |
| `src/components/brand/RevetlyLogo.tsx` | Logo-Aufbau aus den Teilen in `public/logo/` |
| `src/config/demo-timing.ts` | **Alle Zeiten der Demo**: Szenenstarts, Cues, SFX |
| `src/styles/app.css` | Tailwind + `app/globals.css`; schaltet CSS-Transitions im Video ab |
| `webpack-override.cjs` | Tailwind, Alias `@` → Repo-Root, ein React im Bundle |

Wo die App-Komponenten Next, Supabase oder Browser-Ereignisse brauchen (Upload-Seite,
Kandidatenliste, StatCard mit IntersectionObserver), sind sie mit identischen
Tailwind-Klassen nachgebaut und nutzen darin die echten `Card`, `Badge`, `Avatar`
und `Button`. Bewegung kommt ausschließlich aus `interpolate`/`spring`.

## HyperFrames-Overlay

`hyperframes/` ist ein HyperFrames-Projekt (HTML + GSAP, gepinnt auf `hyperframes@0.8.162`).
Es liefert die Hero-Momente der Demo als transparentes WebM (`public/hf/overlay.webm`),
das Remotion über die Szenen legt:

| Komposition | Inhalt |
|---|---|
| `compositions/intro.html` | „Recruiting is time-consuming." als Headline-Slam mit Aufprall |
| `compositions/cuts.html` | Lichtschnitte im Markenverlauf über den drei Szenenwechseln |
| `compositions/accents.html` | Puls um den 94-%-Ring, Glanz über dem Outro-Logo |

`hyperframes/index.html` wird von `scripts/hyperframes.mjs` aus `src/config/demo-timing.ts`
erzeugt, beide Welten laufen also auf denselben Sekunden. Nach einer Timing-Änderung:

```bash
pnpm hf:render      # index.html neu, Lint, Render nach public/hf/overlay.webm
pnpm hf:preview     # HyperFrames-Vorschau im Browser
```

Ohne eigenes Chrome: `HYPERFRAMES_BROWSER_PATH=/pfad/zu/chrome pnpm hf:render`.
Das Skript schaltet die Telemetrie von HyperFrames ab.

## Befehle

```bash
cd video
pnpm install
pnpm studio                       # Vorschau im Browser
pnpm check                        # Timing prüfen (Marker, Lücken > 2 s, SFX)
pnpm stills                       # Abnahme-Standbilder aller Compositions → out/stills/
pnpm stills Demo                  # nur die Produkt-Demo
pnpm stills -- --at 12.5,13.2     # eigene Sekunden
pnpm render                       # Produkt-Demo → out/revetly-demo-16x9.mp4
pnpm render:launch                # Launch-Video v2, beide Formate
pnpm audio                        # SFX und Platzhalter-Musik neu erzeugen
```

Ohne Chromium-Download: `BROWSER=/pfad/zu/chrome pnpm stills`, beim Rendern
`--browser-executable=/pfad/zu/chrome`.

## Launch-Video v2

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
