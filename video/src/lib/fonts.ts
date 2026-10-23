import { cancelRender, continueRender, delayRender, staticFile } from "remotion"

/**
 * Schriften lokal aus public/fonts (Plus Jakarta Sans aus der App,
 * Montserrat aus Fontsource, beide OFL). Gerendert wird erst, wenn sie
 * geladen sind, sonst landen Frames mit Ersatzschrift im Video.
 */
const LATIN =
  "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD"
const LATIN_EXT =
  "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF"

const FACES: { family: string; file: string; range: string }[] = [
  { family: "Plus Jakarta Sans", file: "fonts/pjs-normal-latin.woff2", range: LATIN },
  { family: "Plus Jakarta Sans", file: "fonts/pjs-normal-latinext.woff2", range: LATIN_EXT },
  { family: "Montserrat", file: "fonts/montserrat-latin-wght-normal.woff2", range: LATIN },
  { family: "Montserrat", file: "fonts/montserrat-latin-ext-wght-normal.woff2", range: LATIN_EXT },
]

let started = false

export function loadFonts(): void {
  if (started || typeof document === "undefined") return
  started = true
  const handle = delayRender("Schriften laden")
  Promise.all(
    FACES.map((f) => {
      const weight = f.family === "Montserrat" ? "100 900" : "200 800"
      const face = new FontFace(f.family, `url(${staticFile(f.file)}) format("woff2")`, {
        weight,
        style: "normal",
        unicodeRange: f.range,
      })
      return face.load().then((loaded) => {
        document.fonts.add(loaded)
      })
    }),
  )
    .then(() => continueRender(handle))
    // Lieber abbrechen als mit Ersatzschrift rendern.
    .catch((err) => cancelRender(err))
}
