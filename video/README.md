# Revetly Launch-Video

Remotion-Projekt, unabhängig von der App (eigene `package.json`, eigene Lockfile).
30 Sekunden, 60 fps, zwei Formate mit denselben Szenen:

- `Launch-16x9`: 1920 × 1080
- `Launch-1x1`: 1080 × 1080

## Befehle

```bash
cd video
pnpm install
pnpm studio                 # Vorschau im Browser
pnpm stills                 # ein Standbild pro Szene und Format → out/stills/
pnpm stills -- --zwischen   # zusätzlich Bilder mitten in den Übergängen
pnpm render                 # beide MP4s → out/
```

Ohne Chromium-Download: `BROWSER=/pfad/zu/chrome pnpm stills`, beim Rendern
`--browser-executable=/pfad/zu/chrome`.

## Wo was steht

| Datei | Inhalt |
|---|---|
| `src/config/timeline.ts` | **Alle Timings.** Szenenstarts, Cues innerhalb der Szenen, Musik-Slot |
| `src/config/copy.ts` | Alle Texte auf Bild |
| `src/config/theme.ts` | Farben, Schriften, Easings |
| `src/config/layout.ts` | Layout pro Format (Text- und Bühnenbereich, UI-Größen) |
| `src/data/mock.ts` | Erfundene Beispieldaten (Stelle, Kandidaten, Begründungen) |
| `src/ui/` | UI-Komponenten, nachgebaut nach der App |
| `src/scenes/` | Ebenen des Videos (Karten, Verlauf, Rangliste, Texte, Abschluss) |

## Auf den Beat legen

In `src/config/timeline.ts` die Werte in `SCENES` (Sekunden) verschieben.
Texte und Bewegungen einer Szene hängen am Szenenstart und wandern mit. Die Feinheiten
innerhalb einer Szene (z. B. wann sortiert wird) stehen in `CUES`.

## Musik

Datei nach `public/music/` legen und in `src/config/timeline.ts` eintragen:

```ts
export const MUSIC = { src: "music/launch.mp3", trimStart: 0, volume: 0.85, fadeIn: 0.3, fadeOut: 1.5 }
```

Solange `src` auf `null` steht, rendert das Video stumm.

## Herkunft der UI

Die Komponenten sind nicht importiert, sondern nachgebaut. Die App-Komponenten hängen
an Next, Supabase und CSS-Transitions, Remotion braucht bildgenaue, framegesteuerte
Animationen. Vorlagen:

- Listenzeile: `components/jobs/detail/candidates-tab.tsx` (Listenansicht)
- Score-Ring: `CircularProgress` in `candidate-match-modal.tsx`, Verlauf aus `components/dashboard/score-gauge.tsx`
- Kriterien, Gewichtungen, Begründung: Prüfprotokoll in `candidate-match-modal.tsx`
- Belegzitat: `components/candidates/document-findings.tsx`

Logo: `public/logo.png` ist eine Kopie von `public/revetly/LogoEntwurf-trim.png`,
mit einem entfernten Störpunkt über „ve“. Schriften: Plus Jakarta Sans aus der App,
Montserrat (Fontsource), beide unter OFL.
