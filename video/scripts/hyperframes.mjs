// HyperFrames-Overlay für die Produkt-Demo.
//
//   node scripts/hyperframes.mjs build    index.html aus demo-timing.ts erzeugen + prüfen
//   node scripts/hyperframes.mjs render   dazu als transparentes WebM nach public/hf/overlay.webm
//
// Die Zeiten kommen aus src/config/demo-timing.ts, damit HyperFrames und
// Remotion auf denselben Sekunden laufen. Verschiebt man dort eine Szene,
// genügt `pnpm hf:render`, und der Overlay passt wieder.
import { execFileSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"

import { DEMO_CUES, DEMO_DURATION, SCENE, sat } from "../src/config/demo-timing.ts"

const HF_DIR = path.resolve("hyperframes")
const OUT = path.resolve("public/hf/overlay.webm")

// Bildschirmpositionen der Remotion-Elemente, die einen Akzent bekommen.
// Gemessen an Standbildern der Demo (RevetlyDemo 11.7 s und 28.4 s).
const SCORE_RING = { x: 1424, y: 566 }
const OUTRO_LOGO = { x: 580, y: 309, w: 760 }

const r = (n) => Math.round(n * 1000) / 1000

const hosts = [
  {
    id: "intro",
    start: sat("intro", DEMO_CUES.intro.zeile1),
    duration: DEMO_CUES.intro.zeile1Ab - DEMO_CUES.intro.zeile1,
    vars: { text: "Recruiting is time-consuming.", accent_from: 2 },
  },
  {
    id: "cuts",
    start: 0,
    duration: DEMO_DURATION,
    vars: { at: [SCENE.upload, SCENE.scoring, SCENE.outro].join(","), span: 0.8 },
  },
  {
    id: "accents",
    start: 0,
    duration: DEMO_DURATION,
    vars: {
      pulse_at: r(sat("upload", DEMO_CUES.upload.score + 1.3)),
      pulse_x: SCORE_RING.x,
      pulse_y: SCORE_RING.y,
      gloss_at: r(sat("outro", DEMO_CUES.outro.logo + 1.9)),
      logo_x: OUTRO_LOGO.x,
      logo_y: OUTRO_LOGO.y,
      logo_w: OUTRO_LOGO.w,
    },
  },
]

const hostHtml = hosts
  .map(
    (h, i) => `      <div
        id="${h.id}"
        data-composition-id="${h.id}"
        data-composition-src="compositions/${h.id}.html"
        data-start="${r(h.start)}"
        data-duration="${r(h.duration)}"
        data-track-index="${i + 1}"
        data-track-kind="graphics"
        data-width="1920"
        data-height="1080"
        data-variable-values='${JSON.stringify(h.vars)}'
      ></div>`,
  )
  .join("\n")

const index = `<!doctype html>
<!--
  ERZEUGT von scripts/hyperframes.mjs aus src/config/demo-timing.ts.
  Nicht von Hand ändern, sondern dort die Zeiten anpassen.

  Transparenter Overlay für die Remotion-Composition "RevetlyDemo":
  Headline-Slam im Intro, Lichtschnitte an den Szenenwechseln, Score-Puls
  und Logo-Glanz. Remotion legt das gerenderte WebM über die Szenen.
-->
<html lang="de" data-resolution="landscape">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="assets/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: transparent; }
      #root { position: relative; width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <div
      id="root"
      data-composition-id="main"
      data-start="0"
      data-duration="${DEMO_DURATION}"
      data-width="1920"
      data-height="1080"
      data-fps="30"
    >
${hostHtml}
    </div>
    <script>
      window.__timelines = window.__timelines || {}
      window.__timelines["main"] = gsap.timeline({ paused: true })
    </script>
  </body>
</html>
`

const env = { ...process.env, HYPERFRAMES_NO_TELEMETRY: "1", DO_NOT_TRACK: "1", HYPERFRAMES_SKIP_SKILLS: "1" }
const hf = (args) => execFileSync("npx", ["hyperframes", ...args], { cwd: HF_DIR, env, stdio: "inherit" })

const cmd = process.argv[2] ?? "build"
writeFileSync(path.join(HF_DIR, "index.html"), index)
console.log(`index.html geschrieben (${hosts.map((h) => `${h.id} ${r(h.start)}–${r(h.start + h.duration)} s`).join(", ")})`)

if (cmd === "build" || cmd === "render") hf(["lint"])
if (cmd === "render") {
  mkdirSync(path.dirname(OUT), { recursive: true })
  hf(["render", ".", "--format", "webm", "--fps", "30", "--quality", "delivery", "--output", OUT])
  console.log(`→ ${path.relative(process.cwd(), OUT)}`)
}
