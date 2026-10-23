// Nimmt die echten Animationen der Website Bild für Bild mit 30 fps auf:
// Playwrights Uhr taktet requestAnimationFrame (die Zähler der Seite), CSS-
// Übergänge laufen über das DevTools-Protokoll auf 1/10 der Geschwindigkeit,
// und jedes Bild wird erst geschossen, wenn beide genau 1/30 s weiter sind.
//
//   NODE_PATH=$(npm root -g) node scripts/capture-anim.mjs
// Ergebnis: assets/anim/<name>/0000.png … und assets/anim/<name>.json
import { createRequire } from "node:module"
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"

const require = createRequire(import.meta.url)
const { chromium } = require("playwright")

const URL = process.argv[2] ?? "https://v0-recruily-saas-platform-i6m6ur52i.vercel.app/"
const OUT = path.resolve("assets/anim")
const FPS = 30
const RATE = 0.1 // CSS-Abspielrate während der Aufnahme

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" })

async function record(name, sectionId, textA, textB, seconds, padX = 40) {
  const dir = path.join(OUT, name)
  mkdirSync(dir, { recursive: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
  await page.clock.install()
  // Zähler der Seite (useCountUp) rechnen mit dem Zeitstempel von rAF. Der kommt
  // sonst aus der echten Zeit und liefe hier 1/RATE-mal zu schnell; also die
  // Zeit der Playwright-Uhr durchreichen.
  await page.addInitScript(() => {
    const raf = window.requestAnimationFrame.bind(window)
    window.requestAnimationFrame = (cb) => raf(() => cb(performance.now()))
  })
  await page.goto(URL, { waitUntil: "networkidle", timeout: 90000 })
  // install() lässt die Uhr weiterlaufen; anhalten, damit nur runFor sie bewegt
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1500))

  // Das Einblenden der Karte (.reveal) übernimmt das Video selbst. Hier nur dessen
  // Opazität, Versatz und Unschärfe abschalten, und zwar vor dem Messen (sonst
  // stecken Versatz und Maßstab im Rechteck). Die Klasse .in, an der Zähler,
  // Balken und Bewertungen hängen, setzt die Seite weiterhin selbst.
  await page.addStyleTag({ content: ".reveal{opacity:1!important;transform:none!important;filter:none!important;transition:none!important}" })

  // Rechteck der Karte bestimmen, ohne sie schon ins Bild zu holen
  const r = await page.evaluate(
    ([id, a, b]) => {
      const norm = (t) => (t || "").replace(/\s+/g, "").toLowerCase()
      const sec = document.querySelector("#" + id)
      const find = (t) => [...sec.querySelectorAll("*")].filter((n) => norm(n.textContent).includes(t)).pop()
      let n = find(a)
      const nb = find(b)
      while (n && !n.contains(nb)) n = n.parentElement
      const rr = n.getBoundingClientRect()
      return { x: rr.x + scrollX, y: rr.y + scrollY, w: rr.width, h: rr.height }
    },
    [sectionId, textA, textB],
  )

  const cdp = await page.context().newCDPSession(page)
  await cdp.send("Animation.enable")
  await cdp.send("Animation.setPlaybackRate", { playbackRate: RATE })

  // ins Bild holen: ab hier starten Reveal und Zähler
  await page.evaluate((y) => window.scrollTo({ top: y - 140, behavior: "instant" }), r.y)
  const vp = await page.evaluate(() => ({ sx: scrollX, sy: scrollY }))
  const c = { x: Math.max(0, r.x - vp.sx - padX), y: r.y - vp.sy - 6, width: r.w + 2 * padX, height: r.h + 12 }

  const frames = Math.round(seconds * FPS)
  const stepMs = 1000 / FPS
  for (let i = 0; i < frames; i++) {
    const t0 = Date.now()
    await page.clock.runFor(stepMs)
    await page.screenshot({ path: path.join(dir, `${String(i).padStart(4, "0")}.png`), clip: c })
    // CSS läuft in Echtzeit * RATE: warten, bis auch dort 1/30 s vergangen ist
    const wait = stepMs / RATE - (Date.now() - t0)
    if (wait > 0) await page.waitForTimeout(wait)
  }
  writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify({ name, fps: FPS, frames, w: Math.round(c.width), h: Math.round(c.height) }, null, 2))
  console.log(`${name}: ${frames} Bilder, ${Math.round(c.width)} × ${Math.round(c.height)}`)
  await page.close()
}

await record("score", "match-analyse", "matchscore", "qualifikationssperre", 2.4)
await record("interview", "gespraech", "frontenddev", "60%analyse", 2.6)
await browser.close()
