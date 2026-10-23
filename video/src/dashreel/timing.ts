/**
 * Dashboard-Showreel: alle Zeiten, Texte und Toneinsätze an einer Stelle.
 *
 * Gleiches Raster wie der erste Showreel (120 BPM, `b(n)` = Schlag n, 20 s = 10 Takte),
 * damit dieselbe Szenenstruktur auf die Musik passt. Die Musik selbst ist eine eigene
 * Variante: `node scripts/showreel-audio.mjs dashboard`.
 */
import { b } from "../showreel/timing"

export { b, BEAT, BPM, SR_DURATION as DR_DURATION, SR_FPS as DR_FPS } from "../showreel/timing"

export const SCENE = {
  hook: { from: b(0), to: b(8) }, //          0–4  Problem in fünf Wörtern
  assemble: { from: b(8), to: b(14) }, //     4–7  Dashboard baut sich zusammen
  top: { from: b(14), to: b(20) }, //         7–10 Feature 1: Top-Kandidaten
  prio: { from: b(20), to: b(26) }, //       10–13 Feature 2: Prioritäten
  recent: { from: b(26), to: b(32) }, //     13–16 Feature 3: Letzte Bewerbungen
  metric: { from: b(32), to: b(36) }, //     16–18 Kennzahl
  lockup: { from: b(36), to: b(40) }, //     18–20 Logo + CTA
} as const

export type SceneName = keyof typeof SCENE

/** Ein Wort pro Schlag; danach fliegt der Satz auseinander wie ein Stapel ohne Ordnung. */
export const HOOK = {
  words: ["Zu", "viele", "Bewerbungen,", "null", "Überblick."],
  at: [b(0), b(1), b(2), b(3), b(4)],
  accent: 3, // „null" im Markenverlauf
  scatter: b(5.5),
  land: b(6),
  out: b(7.5),
}

/** Bauteile des ersten Bildschirms landen auf Sechzehnteln und Achteln. Schlüssel = p-<name>.png. */
export const ASSEMBLY: { piece: string; at: number; from: [number, number, number] }[] = [
  { piece: "logo", at: b(8), from: [-300, -120, -10] },
  { piece: "nav", at: b(8.25), from: [0, -200, 0] },
  { piece: "actions", at: b(8.5), from: [300, -120, 10] },
  { piece: "headline", at: b(9), from: [-480, 0, -4] },
  { piece: "kpis", at: b(9.5), from: [480, 0, 4] },
  { piece: "status", at: b(10), from: [-480, 60, 0] },
  { piece: "buttons", at: b(10.5), from: [480, 60, 0] },
  { piece: "score", at: b(11), from: [-200, 520, -8] },
  { piece: "quota", at: b(11.25), from: [0, 600, 0] },
  { piece: "prio", at: b(11.5), from: [200, 520, 8] },
]
export const ASSEMBLY_PUSH = { from: b(12), to: b(14) }

/** Feature-Momente: Zeilen fliegen auf Sechzehnteln ein, Hover auf Schlag 3, Klick auf Schlag 4. */
export type FeatureTiming = { rows: number; hover: number; click: number }
export const feature = (from: number): FeatureTiming => ({ rows: from + b(0.5), hover: from + b(3), click: from + b(4) })

export const METRIC = { slam: b(32), label: b(33), sub: b(33.5), card: b(33.5), out: b(35.5) }
export const LOCKUP = { logo: b(35.6), cta: b(37), hover: b(38), click: b(38.5), url: b(39) }

/**
 * Texte auf Bild. Deutsch wie das Dashboard. Die Kennzahl stammt aus der Karte
 * „Match-Qualität" der Vorschau, also aus Beispieldaten: Platzhalter, bis die echte
 * Zahl feststeht.
 */
export const COPY = {
  captions: {
    top: "Die Besten zuerst.",
    prio: "Was heute ansteht.",
    recent: "Jede Quelle, ein Posteingang.",
  },
  metric: { value: 3.4, suffix: "×", label: "häufiger eingeladen", sub: "bei Score 80+ als bei unter 60." },
  url: "revetly.ai",
}

export type DrSfx = { at: number; sound: string; volume: number }

export function drSfx(): DrSfx[] {
  const cut = (at: number): DrSfx => ({ at: at - 0.12, sound: "whoosh", volume: 0.5 })
  const click = (at: number, volume = 0.75): DrSfx => ({ at, sound: "click", volume })
  const feats = [SCENE.top, SCENE.prio, SCENE.recent].map((s) => feature(s.from))
  return [
    ...HOOK.at.map((at) => ({ at, sound: "tick", volume: 0.35 })),
    { at: HOOK.scatter, sound: "whoosh", volume: 0.45 },
    cut(SCENE.assemble.from),
    ...ASSEMBLY.slice(1).map((a) => ({ at: a.at, sound: "tick", volume: 0.28 })),
    ...[SCENE.top, SCENE.prio, SCENE.recent].map((s) => cut(s.from)),
    ...feats.flatMap((f) => [{ at: f.hover, sound: "tick", volume: 0.4 }, click(f.click)]),
    cut(SCENE.metric.from),
    cut(SCENE.lockup.from),
    { at: LOCKUP.hover, sound: "tick", volume: 0.4 },
    click(LOCKUP.click, 0.9),
    { at: LOCKUP.click, sound: "chime", volume: 0.4 },
  ]
}
