// Nimmt die öffentliche Revetly-Website mit Playwright auf und legt alles
// unter assets/site/ ab: ganze Seite (Desktop + Mobil), jeder Abschnitt
// einzeln, Bilder der Seite, Logo, sowie Farben, Schriften und Texte als JSON.
//
//   NODE_PATH=$(npm root -g) node scripts/capture-site.mjs [url]
import { createRequire } from "node:module"
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"

const require = createRequire(import.meta.url)
const { chromium } = require("playwright")

const URL = process.argv[2] ?? "https://v0-recruily-saas-platform-i6m6ur52i.vercel.app/"
const OUT = path.resolve("assets/site")
mkdirSync(path.join(OUT, "sections"), { recursive: true })
mkdirSync(path.join(OUT, "images"), { recursive: true })

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" })

async function shoot(name, viewport, scale) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: scale })
  await page.goto(URL, { waitUntil: "networkidle", timeout: 90000 })
  // einmal durchscrollen, damit Reveal-Animationen und Lazy-Images auslösen
  const h = await page.evaluate(() => document.body.scrollHeight)
  for (let y = 0; y < h; y += 500) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y)
    await page.waitForTimeout(120)
  }
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(800)
  await page.screenshot({ path: path.join(OUT, `${name}-full.png`), fullPage: true })
  await page.screenshot({ path: path.join(OUT, `${name}-hero.png`) })
  return page
}

const desktop = await shoot("desktop", { width: 1440, height: 900 }, 2)

// Abschnitte einzeln (Elemente unter <main> plus Navigation und Footer)
const sections = await desktop.$$("nav, main > *, footer")
const found = []
for (let i = 0; i < sections.length; i++) {
  const el = sections[i]
  const box = await el.boundingBox()
  if (!box || box.height < 40) continue
  const id = (await el.getAttribute("id")) ?? ""
  const heading = await el.evaluate((n) => (n.querySelector("h1,h2,h3")?.textContent ?? "").trim().slice(0, 90))
  const file = `sections/${String(i).padStart(2, "0")}${id ? "-" + id : ""}.png`
  await el.scrollIntoViewIfNeeded()
  await desktop.waitForTimeout(250)
  await el.screenshot({ path: path.join(OUT, file) })
  found.push({ file, id, heading, w: Math.round(box.width), h: Math.round(box.height) })
}

// Farben, Schriften, Logo, Bilder, Texte
const info = await desktop.evaluate(() => {
  const cs = getComputedStyle(document.documentElement)
  const vars = {}
  for (const name of ["--rv-cyan", "--rv-green", "--rv-cyan-deep", "--rv-green-deep", "--rv-ink", "--rv-mist", "--rv-gradient", "--background", "--primary"]) {
    vars[name] = cs.getPropertyValue(name).trim()
  }
  const fonts = new Set()
  document.querySelectorAll("h1,h2,h3,p,a,button,span").forEach((n) => fonts.add(getComputedStyle(n).fontFamily))
  const imgs = [...document.images].map((im) => ({ src: im.currentSrc || im.src, alt: im.alt, w: im.naturalWidth, h: im.naturalHeight }))
  const texts = [...document.querySelectorAll("h1,h2,h3")].map((n) => n.textContent.trim().replace(/\s+/g, " "))
  const buttons = [...document.querySelectorAll("a,button")].map((n) => n.textContent.trim().replace(/\s+/g, " ")).filter((s) => s && s.length < 60)
  // Zahlen mit Kontext, als Kandidaten für die Kennzahl
  const numbers = [...document.querySelectorAll("main *")]
    .filter((n) => n.children.length === 0 && /\d/.test(n.textContent ?? ""))
    .map((n) => (n.closest("section,div")?.textContent ?? n.textContent).trim().replace(/\s+/g, " ").slice(0, 200))
  return { vars, fonts: [...fonts], imgs, texts, buttons: [...new Set(buttons)], numbers: [...new Set(numbers)].slice(0, 80) }
})

// Bilder der Seite herunterladen
const imgFiles = []
for (const im of info.imgs) {
  if (!im.src || im.src.startsWith("data:")) continue
  try {
    const res = await desktop.request.get(im.src)
    if (!res.ok()) continue
    const name = decodeURIComponent(new URL(im.src).pathname.split("/").pop() || "bild").replace(/[^\w.-]/g, "_")
    const ext = path.extname(name) || "." + (res.headers()["content-type"] ?? "image/png").split("/")[1].split(";")[0]
    const file = `images/${path.basename(name, path.extname(name))}${ext}`
    writeFileSync(path.join(OUT, file), await res.body())
    imgFiles.push({ file, alt: im.alt, w: im.w, h: im.h, src: im.src })
  } catch {
    /* einzelnes Bild nicht ladbar, weiter */
  }
}

await shoot("mobile", { width: 390, height: 844 }, 3)
await browser.close()

writeFileSync(path.join(OUT, "site.json"), JSON.stringify({ url: URL, capturedAt: new Date().toISOString(), sections: found, images: imgFiles, ...info }, null, 2))
console.log(`${found.length} Abschnitte, ${imgFiles.length} Bilder → ${path.relative(process.cwd(), OUT)}`)
