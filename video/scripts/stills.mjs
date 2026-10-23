// Standbilder zur Abnahme, nach out/stills/.
//
//   pnpm stills                     Abnahme-Sekunden, beide Formate
//   pnpm stills 16x9                nur ein Format
//   pnpm stills -- --at 12.5,13.2   eigene Sekunden
//   BROWSER=/pfad/zu/chrome         eigenes Chromium statt des Remotion-Downloads
import path from "node:path"
import { mkdirSync } from "node:fs"
import { bundle } from "@remotion/bundler"
import { renderStill, selectComposition } from "@remotion/renderer"

import override from "../webpack-override.cjs"

const { webpackOverride } = override

/** Abnahme-Zeitpunkte je Composition. */
const SECONDS = {
  RevetlyDemo: [1, 2.6, 4, 5.8, 6.6, 8, 10.6, 12.5, 14.2, 16, 17.8, 19.6, 21, 22.6, 24.2, 25.6, 26.6, 28, 29.5],
  "Launch-16x9": [1, 3, 5, 7, 10, 12, 15, 18, 21, 25, 28],
  "Launch-1x1": [1, 3, 5, 7, 10, 12, 15, 18, 21, 25, 28],
}

//   pnpm stills Demo              nur die Produkt-Demo
//   pnpm stills 16x9              nur Launch-16x9
const args = process.argv.slice(2).filter((a) => a !== "--")
const atIdx = args.indexOf("--at")
const customSeconds = atIdx >= 0 ? args[atIdx + 1].split(",").map(Number) : null
const only = args.find((a, i) => !a.startsWith("--") && (atIdx < 0 || i !== atIdx + 1))
const comps = Object.keys(SECONDS).filter((c) => !only || c.includes(only))
const outDir = path.resolve("out/stills")
mkdirSync(outDir, { recursive: true })

const browserExecutable = process.env.BROWSER || null
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), webpackOverride })

for (const id of comps) {
  const composition = await selectComposition({ serveUrl, id, browserExecutable })
  for (const sec of customSeconds ?? SECONDS[id]) {
    // Frame aus der fps der Composition, keine feste Zahl
    const frame = Math.min(composition.durationInFrames - 1, Math.round(sec * composition.fps))
    const output = path.join(outDir, `${id}_${String(sec).replace(".", "-")}s.png`)
    await renderStill({ serveUrl, composition, frame, output, browserExecutable, overwrite: true })
    console.log(`${id}  ${sec} s  (Frame ${frame})  →  ${path.relative(process.cwd(), output)}`)
  }
}
