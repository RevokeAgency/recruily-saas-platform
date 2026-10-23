// Ein Standbild pro Szene und Format zur Abnahme, nach out/stills/.
//
//   pnpm stills                 alle Szenen, beide Formate
//   pnpm stills 16x9            nur ein Format
//   pnpm stills -- --zwischen   zusätzlich Bilder mitten in den Übergängen
//   BROWSER=/pfad/zu/chrome     eigenes Chromium statt des Remotion-Downloads
//
// Die Zeitpunkte hängen an config/timeline.ts und wandern mit, wenn Szenen
// verschoben werden.
import path from "node:path"
import { mkdirSync } from "node:fs"
import { bundle } from "@remotion/bundler"
import { renderStill, selectComposition } from "@remotion/renderer"

import { at, CUES, FPS } from "../src/config/timeline.ts"

const MOMENTS = [
  ["1-stapel", at("stapel", 3.6)],
  ["2-zaehler", at("zaehler", CUES.zaehler.stunden + 1.6)],
  ["3-unschaerfe", at("unschaerfe", 2.4)],
  ["4-erfassen", at("erfassen", (CUES.erfassen.sweepStart + CUES.erfassen.sweepEnde) / 2 + 0.15)],
  ["5-rangfolge", at("rangfolge", 5.6)],
  ["6-begruendung", at("begruendung", 4.6)],
  ["7-abschluss", at("abschluss", 4.5)],
]

// Mitten in den Bewegungen, um Übergänge auf Sprünge zu prüfen.
const BETWEEN = [
  ["z1-fallen", at("stapel", 1.0)],
  ["z2-zaehlt", at("zaehler", CUES.zaehler.minuten + 0.6)],
  ["z3-auffaechern", at("erfassen", 0.5)],
  ["z4-zu-zeilen", at("rangfolge", 0.6)],
  ["z5-sortieren", at("rangfolge", CUES.rangfolge.sortieren + 0.45)],
  ["z6-aufklappen", at("begruendung", 0.5)],
  ["z7-belege", at("begruendung", CUES.begruendung.belege + 0.5)],
  ["z8-uebergang", at("abschluss", 0.3)],
]

const args = process.argv.slice(2).filter((a) => a !== "--")
const between = args.includes("--zwischen")
const only = args.find((a) => !a.startsWith("--"))
const comps = ["Launch-16x9", "Launch-1x1"].filter((c) => !only || c.endsWith(only))
const outDir = path.resolve("out/stills")
mkdirSync(outDir, { recursive: true })

const browserExecutable = process.env.BROWSER || null
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") })

for (const id of comps) {
  const composition = await selectComposition({ serveUrl, id, browserExecutable })
  for (const [name, sec] of between ? [...MOMENTS, ...BETWEEN] : MOMENTS) {
    const frame = Math.round(sec * FPS)
    const output = path.join(outDir, `${id}_${name}.png`)
    await renderStill({ serveUrl, composition, frame, output, browserExecutable, overwrite: true })
    console.log(`${id}  ${name}  Frame ${frame} (${sec.toFixed(2)} s)  →  ${path.relative(process.cwd(), output)}`)
  }
}
