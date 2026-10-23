// Nimmt einzelne UI-Elemente der Revetly-Website als echte Ausschnitte auf
// (deviceScaleFactor 2) und die Zustände, die der Cursor im Video auslöst:
//   - Vorher/Nachher-Regler bei 100 %, 50 % und 0 %
//   - Match-Analyse-Karte während die Balken und der Score hochlaufen
//   - Gesprächsleitfaden während der Match-Wert mitzählt
// Ergebnis: assets/ui/*.png und assets/ui/ui.json (Maße, Positionen der
// Unterelemente für Cursor-Ziele).
//
//   NODE_PATH=$(npm root -g) node scripts/capture-ui.mjs [url]
import { createRequire } from "node:module"
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"

const require = createRequire(import.meta.url)
const { chromium } = require("playwright")

const URL = process.argv[2] ?? "https://v0-recruily-saas-platform-i6m6ur52i.vercel.app/"
const OUT = path.resolve("assets/ui")
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" })
const meta = {}

async function freshPage() {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
  await page.goto(URL, { waitUntil: "networkidle", timeout: 90000 })
  await page.waitForTimeout(600)
  return page
}

/** Rechteck des kleinsten gemeinsamen Vorfahren zweier Texte (Seitenkoordinaten). */
async function boxOf(page, a, b) {
  return page.evaluate(
    ([a, b]) => {
      const norm = (s) => (s || "").replace(/\s+/g, "").toLowerCase()
      const find = (txt) => {
        const all = [...document.querySelectorAll("body *")].filter((n) => norm(n.textContent).includes(norm(txt)))
        return all[all.length - 1] // tiefster Treffer
      }
      const na = find(a)
      const nb = b ? find(b) : na
      if (!na || !nb) return null
      let n = na
      while (n && !n.contains(nb)) n = n.parentElement
      n.scrollIntoView({ block: "center" })
      const r = n.getBoundingClientRect()
      return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height }
    },
    [a, b],
  )
}

/** Rechteck eines CSS-Selektors (Seitenkoordinaten). */
async function boxSel(page, sel) {
  return page.evaluate((sel) => {
    const n = document.querySelector(sel)
    if (!n) return null
    const r = n.getBoundingClientRect()
    return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height }
  }, sel)
}

/** Position eines Texts relativ zu einem Rechteck (für Cursor-Ziele). */
async function pointIn(page, txt, rect) {
  return page.evaluate(
    ([txt, rect]) => {
      const norm = (s) => (s || "").replace(/\s+/g, "").toLowerCase()
      const all = [...document.querySelectorAll("body *")].filter((n) => norm(n.textContent).includes(norm(txt)))
      const n = all[all.length - 1]
      if (!n) return null
      const r = n.getBoundingClientRect()
      return { x: r.x + scrollX + r.width / 2 - rect.x, y: r.y + scrollY + r.height / 2 - rect.y, w: r.width, h: r.height }
    },
    [txt, rect],
  )
}

async function clip(page, name, rect, pad = 0) {
  // fullPage + Seitenkoordinaten: unabhängig von der Scrollposition
  const c = { x: Math.max(0, rect.x - pad), y: Math.max(0, rect.y - pad), width: rect.w + 2 * pad, height: rect.h + 2 * pad }
  if (c.width < 2 || c.height < 2) return console.warn(`übersprungen: ${name} (leer)`)
  await page.screenshot({ path: path.join(OUT, `${name}.png`), clip: c, fullPage: true })
  meta[name] = { w: Math.round(c.width), h: Math.round(c.height) }
}

// ---------- Hero: Teile für den Aufbau ----------
// Alles im ersten Bildschirm bei Scroll 0, als Viewport-Ausschnitt (die
// Navigation ist fixiert und würde bei fullPage verrutschen).
{
  const page = await freshPage()
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }))
  await page.waitForTimeout(1500)
  const rects = await page.evaluate(() => {
    const norm = (t) => (t || "").replace(/\s+/g, "").toLowerCase()
    const r = (n) => {
      const b = n.getBoundingClientRect()
      return { x: b.x, y: b.y, w: b.width, h: b.height }
    }
    const byText = (t, tag = "*") => [...document.querySelectorAll(tag)].filter((n) => norm(n.textContent).includes(t)).pop()
    const header = document.querySelector("header") || document.querySelector("nav")
    let nav = header
    while (nav && nav.getBoundingClientRect().height > 120) nav = nav.firstElementChild
    return {
      "hero-nav": header ? r(header.querySelector("div") || header) : null,
      "hero-badge": r(byText("ki-recruiting-assistent", "span, div")),
      "hero-headline": r(document.querySelector("h1")),
      "hero-copy": r(byText("revetlyliestjedebewerbung", "p")),
      "hero-cta": r([...document.querySelectorAll("a, button")].find((n) => norm(n.textContent).includes("erstestellekostenlostesten"))),
      "hero-trust": r(byText("jedermatchbelegt", "ul, div")),
    }
  })
  for (const [name, rr] of Object.entries(rects)) {
    if (!rr || rr.w < 2) continue
    const pad = 8
    const c = { x: Math.max(0, rr.x - pad), y: Math.max(0, rr.y - pad), width: rr.w + 2 * pad, height: rr.h + 2 * pad }
    await page.screenshot({ path: path.join(OUT, `${name}.png`), clip: c })
    meta[name] = { w: Math.round(c.width), h: Math.round(c.height), x: Math.round(c.x), y: Math.round(c.y) }
  }
  await page.screenshot({ path: path.join(OUT, "hero-viewport.png") })
  meta["hero-viewport"] = { w: 1440, h: 900 }
  await page.close()
}

// ---------- Ablauf: fünf Schritte ----------
{
  const page = await freshPage()
  const r = await page.evaluate(() => {
    const norm = (t) => (t || "").replace(/\s+/g, "").toLowerCase()
    const sec = document.querySelector("#ablauf")
    const find = (t) => [...sec.querySelectorAll("*")].filter((n) => norm(n.textContent).includes(t)).pop()
    let n = find("stelleanlegen")
    const b = find("entscheiden")
    while (n && !n.contains(b)) n = n.parentElement
    n.scrollIntoView({ block: "center", behavior: "instant" })
    const rr = n.getBoundingClientRect()
    return { x: rr.x + scrollX, y: rr.y + scrollY, w: rr.width, h: rr.height }
  })
  await page.waitForTimeout(1200)
  if (r) await clip(page, "steps", r, 10)
  await page.close()
}

// ---------- Vorher/Nachher-Regler ----------
{
  const page = await freshPage()
  const r0 = await boxOf(page, "Ohne Revetly", "Mit Revetly")
  await page.waitForTimeout(2500)
  // nach dem Einblenden neu messen (die Karte gleitet beim Reveal ein)
  const r = (await boxOf(page, "Ohne Revetly", "Mit Revetly")) ?? r0
  const range = page.locator('input[type="range"]').first()
  for (const [name, key] of [["compare-100", "End"], ["compare-0", "Home"]]) {
    await range.focus()
    await page.keyboard.press(key)
    await page.waitForTimeout(700)
    await page.evaluate(() => document.activeElement && document.activeElement.blur())
    await page.waitForTimeout(400)
    await clip(page, name, r, 2)
  }
  // Mitte: 50 Schritte von 0 aus
  await range.focus()
  for (let i = 0; i < 50; i++) await page.keyboard.press("ArrowRight")
  await page.waitForTimeout(700)
  await page.evaluate(() => document.activeElement && document.activeElement.blur())
  await page.waitForTimeout(300)
  await clip(page, "compare-50", r, 2)
  meta.compare = { rect: r }
  await page.close()
}

// ---------- Match-Analyse: Karte und hochlaufende Balken ----------
{
  const page = await freshPage()
  // erst Rechteck bestimmen, ohne die Karte ins Bild zu holen
  const r = await page.evaluate(() => {
    const norm = (s) => (s || "").replace(/\s+/g, "").toLowerCase()
    const sec = document.querySelector("#match-analyse")
    const find = (t) => [...sec.querySelectorAll("*")].filter((n) => norm(n.textContent).includes(t)).pop()
    let n = find("matchscore")
    const b = find("qualifikationssperre")
    while (n && !n.contains(b)) n = n.parentElement
    const rr = n.getBoundingClientRect()
    return { x: rr.x + scrollX, y: rr.y + scrollY, w: rr.width, h: rr.height }
  })
  // ins Bild holen und die Animation in Einzelbildern mitschneiden
  await page.evaluate((y) => window.scrollTo({ top: y - 150, behavior: "instant" }), r.y)
  const vp = await page.evaluate(() => ({ sx: scrollX, sy: scrollY }))
  const c = { x: r.x - vp.sx - 2, y: r.y - vp.sy - 2, width: r.w + 4, height: r.h + 4 }
  const t0 = Date.now()
  const frames = []
  for (let i = 0; i < 26; i++) {
    const f = `score-seq-${String(i).padStart(2, "0")}`
    await page.screenshot({ path: path.join(OUT, `${f}.png`), clip: c })
    frames.push({ file: `${f}.png`, ms: Date.now() - t0 })
  }
  await page.waitForTimeout(1500)
  await page.screenshot({ path: path.join(OUT, "score-card.png"), clip: c })
  meta["score-card"] = { w: Math.round(c.width), h: Math.round(c.height) }
  meta["score-seq"] = frames
  meta["score-targets"] = {
    candidate: await pointIn(page, "Lena Maier", r),
    topMatch: await pointIn(page, "Top-Match", r),
    score: await pointIn(page, "/100", r),
  }
  await page.close()
}

// ---------- Gesprächsleitfaden: Match zählt mit ----------
{
  const page = await freshPage()
  const r = await page.evaluate(() => {
    const norm = (s) => (s || "").replace(/\s+/g, "").toLowerCase()
    const sec = document.querySelector("#gespraech")
    const find = (t) => [...sec.querySelectorAll("*")].filter((n) => norm(n.textContent).includes(t)).pop()
    let n = find("gesprächsleitfaden") === sec ? null : [...sec.querySelectorAll("*")].filter((x) => norm(x.textContent).includes("frontenddev")).pop()
    const b = find("60%analyse")
    while (n && b && !n.contains(b)) n = n.parentElement
    const rr = n.getBoundingClientRect()
    return { x: rr.x + scrollX, y: rr.y + scrollY, w: rr.width, h: rr.height }
  })
  await page.evaluate((y) => window.scrollTo({ top: y - 120, behavior: "instant" }), r.y)
  const vp = await page.evaluate(() => ({ sx: scrollX, sy: scrollY }))
  // großzügiger Rand: die Karte gleitet beim Einblenden von der Seite herein
  const c = { x: Math.max(0, r.x - vp.sx - 40), y: r.y - vp.sy - 4, width: r.w + 80, height: r.h + 8 }
  const t0 = Date.now()
  const frames = []
  for (let i = 0; i < 30; i++) {
    const f = `interview-seq-${String(i).padStart(2, "0")}`
    await page.screenshot({ path: path.join(OUT, `${f}.png`), clip: c })
    frames.push({ file: `${f}.png`, ms: Date.now() - t0 })
  }
  await page.waitForTimeout(2000)
  await page.screenshot({ path: path.join(OUT, "interview-card.png"), clip: c })
  meta["interview-card"] = { w: Math.round(c.width), h: Math.round(c.height) }
  meta["interview-seq"] = frames
  meta["interview-targets"] = { rating: await pointIn(page, "Zusammenarbeit", r), match: await pointIn(page, "Match", r) }
  await page.close()
}

// ---------- Automatik-Karte und Schluss-CTA ----------
{
  const page = await freshPage()
  const r = await page.evaluate(() => {
    const sec = document.querySelector("#automatisch")
    const ul = sec.querySelector("ul")
    let n = ul
    while (n && n.getBoundingClientRect().width < 380) n = n.parentElement
    n.scrollIntoView({ block: "center", behavior: "instant" })
    const rr = n.getBoundingClientRect()
    return { x: rr.x + scrollX, y: rr.y + scrollY, w: rr.width, h: rr.height }
  })
  await page.waitForTimeout(5000)
  if (r) await clip(page, "automation-card", r, 2)
  const cta = await boxOf(page, "Teste Revetly mit", "Beispiel ansehen")
  await page.waitForTimeout(1200)
  if (cta) await clip(page, "cta-card", cta, 2)
  await page.close()
}

await browser.close()
writeFileSync(path.join(OUT, "ui.json"), JSON.stringify(meta, null, 2))
console.log(Object.keys(meta).join(", "))
