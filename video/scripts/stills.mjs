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

/** Abnahme-Zeitpunkte laut Briefing. */
const SECONDS = [1, 3, 5, 7, 10, 12, 15, 18, 21, 25, 28]

const args = process.argv.slice(2).filter((a) => a !== "--")
const atIdx = args.indexOf("--at")
const seconds = atIdx >= 0 ? args[atIdx + 1].split(",").map(Number) : SECONDS
const only = args.find((a, i) => !a.startsWith("--") && i !== atIdx + 1)
const comps = ["Launch-16x9", "Launch-1x1"].filter((c) => !only || c.endsWith(only))
const outDir = path.resolve("out/stills")
mkdirSync(outDir, { recursive: true })

const browserExecutable = process.env.BROWSER || null
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") })

for (const id of comps) {
  const composition = await selectComposition({ serveUrl, id, browserExecutable })
  for (const sec of seconds) {
    // Frame aus der fps der Composition, keine feste Zahl
    const frame = Math.min(composition.durationInFrames - 1, Math.round(sec * composition.fps))
    const output = path.join(outDir, `${id}_${String(sec).replace(".", "-")}s.png`)
    await renderStill({ serveUrl, composition, frame, output, browserExecutable, overwrite: true })
    console.log(`${id}  ${sec} s  (Frame ${frame})  →  ${path.relative(process.cwd(), output)}`)
  }
}
