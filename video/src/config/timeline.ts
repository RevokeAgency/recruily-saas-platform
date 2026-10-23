/**
 * ZENTRALE TIMINGS — alles, was auf den Beat geschoben werden soll, steht hier.
 *
 * Alle Angaben in Sekunden. Eine Szene endet dort, wo die nächste beginnt.
 * Die Cues innerhalb einer Szene sind relativ zum Szenenstart. Verschiebst du
 * den Start einer Szene, wandern ihre Texte und Bewegungen automatisch mit.
 *
 * Auf den Beat legen: Bei z. B. 120 BPM liegt ein Schlag alle 0,5 s.
 * Die Szenenstarts einfach auf die passenden Vielfachen setzen.
 */

export const FPS = 60
export const DURATION = 30

export const SCENES = {
  stapel: 0, //       1  Bewerbungskarten stapeln sich
  zaehler: 4, //      2  Zähler: 15 Minuten, 20 Stunden
  unschaerfe: 8, //   3  Stapel verschwimmt
  erfassen: 11, //    4  Verlauf fährt durchs Bild
  rangfolge: 14, //   5  Rangfolge mit Scores
  begruendung: 20, // 6  Ein Kandidat klappt auf
  abschluss: 25, //   7  Logo, Tagline, CTA
} as const

export type SceneId = keyof typeof SCENES

/** Cues innerhalb der Szenen, relativ zum jeweiligen Szenenstart. */
export const CUES = {
  stapel: {
    text: 1.1, //             „80 Bewerbungen."
    letzteKarte: 2.9, //      bis hier sind alle 80 Karten gelandet
  },
  zaehler: {
    minuten: 0.2, //          „15 Minuten pro Bewerbung." (Zähler läuft hoch)
    stunden: 2.1, //          „20 Stunden."
  },
  unschaerfe: {
    blur: 0.1, //             Stapel beginnt zu verschwimmen
    text: 0.5, //             „Die hat niemand."
  },
  erfassen: {
    auffaechern: 0.0, //      Stapel fächert sich zum Raster auf
    sweepStart: 0.55, //      Verlauf beginnt
    sweepEnde: 2.35, //       Verlauf ist durch
    text: 0.35, //            „Revetly liest alles."
  },
  rangfolge: {
    zeilen: 0.15, //          Karten werden zu Listenzeilen
    text1: 0.3, //            „Jede Bewerbung."
    sortieren: 2.0, //        Zeilen sortieren sich nach Score
    text2: 2.0, //            „Sortiert."
    text3: 3.6, //            „Nachvollziehbar bewertet."
  },
  begruendung: {
    aufklappen: 0.0, //       Zeile 1 klappt auf
    belege: 0.9, //           Begründungen erscheinen nacheinander
    text: 0.4, //             „Jeder Punkt belegt."
  },
  abschluss: {
    logo: 0.45,
    tagline: 1.25,
    cta: 1.9,
  },
} as const

/**
 * Musik-Slot. Datei nach video/public/music/ legen und hier eintragen,
 * z. B. src: "music/launch.mp3". Solange src null ist, rendert das Video stumm.
 */
export const MUSIC = {
  src: null as string | null,
  /** Sekunden, die am Anfang der Datei übersprungen werden. */
  trimStart: 0,
  volume: 0.85,
  fadeIn: 0.3,
  fadeOut: 1.5,
}

/** Absolute Zeit in Sekunden für Szene + Offset. */
export function at(scene: SceneId, offset = 0): number {
  return SCENES[scene] + offset
}

/** Ende einer Szene (= Start der nächsten bzw. Videoende). */
export function sceneEnd(scene: SceneId): number {
  const starts = Object.values(SCENES).sort((a, b) => a - b)
  const next = starts.find((s) => s > SCENES[scene])
  return next ?? DURATION
}
