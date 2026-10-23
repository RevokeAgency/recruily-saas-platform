// Nimmt die Dashboard-Vorschau (statischer HTML-Schnappschuss mit erfundenen
// Beispieldaten, Branch preview/dashboard-html) mit Playwright auf:
// erster Bildschirm, ganze Seite, jedes Bauteil und jede Karte einzeln, echte
// Hover-Zustände, Logo, Farben, Schriften und Texte.
//
//   NODE_PATH=$(npm root -g) node scripts/capture-dashboard.mjs [url]
// Ergebnis: assets/dashboard/
import { createRequire } from "node:module"
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"

const require = createRequire(import.meta.url)
const { chromium } = require("playwright")

const URL = process.argv[2] ?? "https://raw.githack.com/RevokeAgency/recruily-saas-platform/preview/dashboard-html/dashboard-preview.html"
const OUT = path.resolve("assets/dashboard")
mkdirSync(path.join(OUT, "parts"), { recursive: true })
mkdirSync(path.join(OUT, "hover"), { recursive: true })

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" })

async function open(viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 2 })
  await page.goto(URL, { waitUntil: "networkidle", timeout: 90000 })
  // raw.githack zeigt im Browser erst eine Zwischenseite
  const gate = page.getByText("Open the page")
  if (await gate.count()) await Promise.all([page.waitForLoadState("networkidle"), gate.click()])
  await page.waitForSelector("text=Willkommen zurück")
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(600)
  return page
}

// Rechtecke im Dokument (CSS-Pixel), per Text gefunden
const RECTS = () => {
  const norm = (t) => (t || "").replace(/\s+/g, "").toLowerCase()
  const all = [...document.querySelectorAll("body *")]
  const find = (t, maxY = Infinity) =>
    all.filter((n) => norm(n.textContent).includes(norm(t)) && n.getBoundingClientRect().y + scrollY < maxY && n.getBoundingClientRect().width > 0).pop()
  const common = (a, b, maxY) => {
    let n = find(a, maxY)
    const nb = find(b, maxY)
    while (n && !n.contains(nb)) n = n.parentElement
    return n
  }
  // Kleinstes Element mit genau diesem Text, Vereinigung mehrerer Rechtecke
  const exact = (t, maxY) =>
    all.filter((n) => norm(n.textContent) === norm(t) && n.getBoundingClientRect().y + scrollY < maxY && n.getBoundingClientRect().width > 0).pop()
  const union = (maxY, ...ts) => {
    const bs = ts.map((t) => exact(t, maxY).getBoundingClientRect())
    const x0 = Math.min(...bs.map((b) => b.x))
    const y0 = Math.min(...bs.map((b) => b.y))
    const x1 = Math.max(...bs.map((b) => b.right))
    const y1 = Math.max(...bs.map((b) => b.bottom))
    return { getBoundingClientRect: () => ({ x: x0, y: y0, width: x1 - x0, height: y1 - y0 }) }
  }
  // Karte = nächster Vorfahr mit weißem/dunklem Hintergrund und abgerundeten Ecken
  const card = (t) => {
    let n = find(t)
    while (n && !(parseFloat(getComputedStyle(n).borderTopLeftRadius) >= 16 && n.getBoundingClientRect().height > 150)) n = n.parentElement
    return n
  }
  const r = (n) => {
    const b = n.getBoundingClientRect()
    return { x: Math.round(b.x * 2) / 2, y: Math.round((b.y + scrollY) * 2) / 2, w: Math.round(b.width * 2) / 2, h: Math.round(b.height * 2) / 2 }
  }
  const logo = document.querySelector("img[alt=Revetly]").closest("a")
  return {
    parts: {
      logo: r(logo),
      nav: r(common("Stellenangebote", "Einstellungen", 120)),
      actions: r(union(120, "184/300", "LH")),
      headline: r(common("Willkommen", "erklärbare Matches", 200)),
      kpis: r(common("Aktive Jobs", "137", 200)),
      status: r(union(300, "Bewertet", "54%", "23%")),
      buttons: r(common("Kandidaten hochladen", "Neuen Job erstellen", 300)),
    },
    cards: {
      score: r(card("Match-Score")),
      quota: r(card("Matching-Kontingent")),
      prio: r(card("3 Interviews auszuwerten")),
      recent: r(card("Letzte Bewerbungen")),
      top: r(card("Top-Kandidaten")),
      kpi: r(card("Recruiting-Kennzahlen")),
      quality: r(card("Match-Qualität")),
      activity: r(card("Letzte Aktivitäten")),
    },
  }
}

// ---------------------------------------------------------------- erster Bildschirm + Bauteile
const page = await open({ width: 1440, height: 900 })
await page.screenshot({ path: path.join(OUT, "viewport.png") })
const geo = await page.evaluate(RECTS)
const clip = (b, pad = 0) => ({ x: b.x - pad, y: b.y - pad, width: b.w + 2 * pad, height: b.h + 2 * pad })
for (const [name, b] of Object.entries(geo.parts)) await page.screenshot({ path: path.join(OUT, "parts", `${name}.png`), clip: clip(b) })

// Logo als Datei (eingebettetes PNG)
const logoSrc = await page.evaluate(() => document.querySelector("img[alt=Revetly]").src)
writeFileSync(path.join(OUT, "logo.png"), Buffer.from(logoSrc.split(",")[1], "base64"))

// Farben, Schriften, Texte
const info = await page.evaluate(() => {
  const cs = getComputedStyle(document.documentElement)
  const vars = {}
  for (const v of ["--primary", "--background", "--foreground", "--card", "--muted", "--accent", "--border", "--rv-cyan", "--rv-green", "--rv-ink", "--chart-1", "--chart-2", "--radius"]) vars[v] = cs.getPropertyValue(v).trim()
  const fonts = new Set()
  document.querySelectorAll("h1,h2,h3,p,a,button,span").forEach((n) => fonts.add(getComputedStyle(n).fontFamily))
  const texts = [...document.querySelectorAll("h1,h2,h3,a,button")].map((n) => n.textContent.trim().replace(/\s+/g, " ")).filter((s) => s && s.length < 90)
  return { title: document.title, vars, fonts: [...fonts], texts: [...new Set(texts)] }
})
await page.close()

// ---------------------------------------------------------------- ganze Seite + Karten
const tall = await open({ width: 1440, height: 1800 })
await tall.screenshot({ path: path.join(OUT, "full.png") })
const geoTall = await tall.evaluate(RECTS)
for (const [name, b] of Object.entries(geoTall.cards)) await tall.screenshot({ path: path.join(OUT, `card-${name}.png`), clip: clip(b) })

// Echte Hover-Zustände: Maus auf das Element, Karte neu aufnehmen
const hovers = [
  { name: "top-1", card: "top", text: "Elena Novak", row: 0 },
  { name: "prio-1", card: "prio", text: "3 Interviews auszuwerten" },
  { name: "activity-1", card: "activity", text: "Autohaus Steiner" },
  { name: "recent-5", card: "recent", text: "David Brunner" },
  { name: "btn-upload", card: null, text: "Kandidaten hochladen" },
  { name: "btn-job", card: null, text: "Neuen Job erstellen" },
]
const hoverInfo = {}
for (const h of hovers) {
  // Zeile mit diesem Text: der Link (a), der ihn enthält
  const target = h.name === "top-1" ? tall.locator("a", { hasText: "Jonas Leitner" }).nth(1) : tall.locator("a", { hasText: h.text }).first()
  const box = await target.boundingBox()
  await tall.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2)
  await tall.waitForTimeout(500) // CSS-Übergänge der Seite auslaufen lassen
  const b = h.card ? geoTall.cards[h.card] : { x: box.x - 12, y: box.y - 12, w: box.width + 24, h: box.height + 24 }
  await tall.screenshot({ path: path.join(OUT, "hover", `${h.name}.png`), clip: clip(b) })
  hoverInfo[h.name] = { card: h.card, target: { x: box.x, y: box.y, w: box.width, h: box.height } }
  await tall.mouse.move(2, 2)
  await tall.waitForTimeout(500)
  if (!h.card) await tall.screenshot({ path: path.join(OUT, "hover", `${h.name}-idle.png`), clip: clip(b) })
}
await browser.close()

writeFileSync(
  path.join(OUT, "dashboard.json"),
  JSON.stringify({ url: URL, capturedAt: new Date().toISOString(), viewport: { w: 1440, h: 900, scale: 2 }, parts: geo.parts, cards: geoTall.cards, hovers: hoverInfo, ...info }, null, 2),
)
console.log("Bauteile:", Object.keys(geo.parts).join(", "))
console.log("Karten:", Object.keys(geoTall.cards).join(", "))
console.log("Hover:", Object.keys(hoverInfo).join(", "))
