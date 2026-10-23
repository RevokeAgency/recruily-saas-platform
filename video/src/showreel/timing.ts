/**
 * Showreel: alle Zeiten, Texte und Toneinsätze an einer Stelle.
 *
 * 120 BPM: ein Schlag = 0,5 s, ein Takt = 2 s, 20 s = 10 Takte. Jeder Einsatz
 * hängt an `b(n)` (Schlag n ab 0), Achtel sind halbe Schläge. Die Musik aus
 * scripts/showreel-audio.mjs baut auf demselben Raster.
 */
export const SR_FPS = 30
export const SR_DURATION = 20
export const BPM = 120
export const BEAT = 60 / BPM

/** Zeitpunkt von Schlag n (Sekunden). */
export const b = (n: number) => n * BEAT

/** Die sieben Beats des Films (Sekunden). */
export const SCENE = {
  hook: { from: b(0), to: b(8) }, //            0–4  Problem in fünf Wörtern
  assemble: { from: b(8), to: b(14) }, //       4–7  Hero baut sich zusammen
  compare: { from: b(14), to: b(20) }, //       7–10 Feature 1: Regler
  score: { from: b(20), to: b(26) }, //        10–13 Feature 2: Match-Analyse
  interview: { from: b(26), to: b(32) }, //    13–16 Feature 3: Gesprächsleitfaden
  metric: { from: b(32), to: b(36) }, //       16–18 Kennzahl
  lockup: { from: b(36), to: b(40) }, //       18–20 Logo + CTA
} as const

export type SceneName = keyof typeof SCENE

/** Kinetische Typo im Hook: ein Wort pro Schlag, „oben." fällt danach nach unten. */
export const HOOK = {
  words: ["Die", "Beste", "liegt", "selten", "oben."],
  at: [b(0), b(1), b(2), b(3), b(4)],
  accent: 1, // „Beste" im Markenverlauf
  fall: b(5.5), // „oben." kippt …
  land: b(6), // … und schlägt unten auf
  out: b(7.5),
}

/** Hero-Bauteile landen auf Achteln. Schlüssel = Dateien in public/showreel/hero. */
export const ASSEMBLY: { piece: string; at: number; from: [number, number, number] }[] = [
  { piece: "nav", at: b(8), from: [0, -140, 0] },
  { piece: "badge", at: b(8.5), from: [-260, 0, -8] },
  { piece: "h1", at: b(9), from: [-420, 40, -6] },
  { piece: "h2", at: b(9.5), from: [420, 40, 6] },
  { piece: "h3", at: b(10), from: [-420, 60, -5] },
  { piece: "h4", at: b(10.5), from: [420, 60, 5] },
  { piece: "copy", at: b(11), from: [0, 220, 0] },
  { piece: "cta", at: b(11.5), from: [0, 260, 0] },
  { piece: "trust", at: b(12), from: [0, 160, 0] },
]
export const ASSEMBLY_PUSH = { from: b(12), to: b(14) }

/** Feature 1: Cursor greift den Regler und zieht ihn nach links. */
export const COMPARE = {
  arrive: b(14.5),
  grab: b(15),
  release: b(17),
  pulse: b(18),
  // Teilerposition als Anteil der Breite: Mitte → fast ganz links
  fromRatio: 0.5,
  toRatio: 0.035,
}

/** Feature 2: Klick auf die Kandidatenzeile startet die echte Zählung (0 → 87). */
export const SCORE = { click: b(21), right: b(22), pulse: b(24) }

/**
 * Feature 3: Bild der aufgenommenen Folge zu jeder Zeit. Die Klicks der Seite
 * (Bilder 18, 24, 31) landen auf Achteln, die Zählung 72 → 78 (Bilder 39–55) danach.
 */
export const INTERVIEW = {
  map: [
    [b(26), 0],
    [b(27), 18],
    [b(27.5), 24],
    [b(28), 31],
    [b(28.5), 39],
    [b(29.5), 55],
    [b(32), 77],
  ] as [number, number][],
  clicks: [b(27), b(27.5), b(28)],
  pulse: b(30),
}

export const METRIC = { slam: b(32), label: b(33), sub: b(34), out: b(35.5) }
export const LOCKUP = { logo: b(35.6), cta: b(37.5), click: b(38.5), sub: b(38.5), url: b(39) }

/**
 * Texte auf Bild. Deutsch wie die Website; Sätze in Anführung sind wörtlich
 * von dort. METRIC ist ein Platzhalter, bis die echte Kennzahl feststeht.
 */
export const COPY = {
  captions: {
    compare: "Ranking nach Passung.",
    score: "Jede Zahl mit Beleg.",
    interview: "Das Gespräch zählt mit.",
  },
  metric: { value: 9, unit: "Ebenen", label: "pro Bewerbung,", sub: "jede einzeln belegt." },
  ctaSub: "25 Matches gratis · keine Kreditkarte",
  url: "revetly.ai",
}

export type SrSfx = { at: number; sound: string; volume: number }

/** Soundeffekte über der Musik (Dateien in public/sfx). Musik trägt die Schläge selbst. */
export function srSfx(): SrSfx[] {
  const cut = (at: number): SrSfx => ({ at: at - 0.12, sound: "whoosh", volume: 0.5 })
  const click = (at: number, volume = 0.75): SrSfx => ({ at, sound: "click", volume })
  return [
    ...HOOK.at.map((at) => ({ at, sound: "tick", volume: 0.35 })),
    { at: HOOK.fall, sound: "whoosh", volume: 0.35 },
    cut(SCENE.assemble.from),
    ...ASSEMBLY.slice(1).map((a) => ({ at: a.at, sound: "tick", volume: 0.3 })),
    cut(SCENE.compare.from),
    click(COMPARE.grab),
    { at: COMPARE.grab + 0.05, sound: "whoosh", volume: 0.3 },
    click(COMPARE.release, 0.5),
    cut(SCENE.score.from),
    click(SCORE.click),
    cut(SCENE.interview.from),
    ...INTERVIEW.clicks.map((at) => click(at)),
    { at: INTERVIEW.pulse, sound: "chime", volume: 0.3 },
    cut(SCENE.metric.from),
    cut(SCENE.lockup.from),
    click(LOCKUP.click, 0.9),
    { at: LOCKUP.click, sound: "chime", volume: 0.4 },
  ]
}
