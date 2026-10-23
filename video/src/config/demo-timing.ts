/**
 * TIMING DER PRODUKT-DEMO (Composition "RevetlyDemo")
 *
 * Alle Zeiten in Sekunden, umgerechnet wird nur über useVideoConfig().fps.
 * Szenengrenzen und Ereignisse stehen ausschließlich hier. Bei 120 BPM liegen
 * 5, 10, 15, 19, 25 genau auf Schlägen; mit snap() aus timing.ts lassen sich
 * Werte auf ein anderes Tempo legen.
 */
import type { SfxCue } from "./timing"

export const DEMO_FPS = 30
export const DEMO_DURATION = 30

export const SCENE = {
  intro: 0, //     Szene 1: kinetischer Text, Logo
  upload: 5, //    Szene 2: Dropzone, Analyse, Ergebnis
  scoring: 15, //  Szene 3: Dashboard in 3D, Zoom auf die KI-Zusammenfassung
  outro: 25, //    Szene 4: Features laufen zusammen, Logo, CTA
  ende: 30,
} as const

export type SceneId = keyof typeof SCENE

/** Absolute Zeit: Szenenstart + Offset. */
export function sat(scene: SceneId, offset = 0): number {
  return SCENE[scene] + offset
}

/** Überblendung zwischen zwei Szenen (die alte geht, die neue kommt). */
export const HANDOFF = 0.7

export const DEMO_CUES = {
  intro: {
    zeile1: 0.25, //       „Recruiting is time-consuming."
    zeile1Ab: 2.1, //      geht
    meet: 2.35, //         „Meet"
    logo: 2.75, //         Logo baut sich auf
  },
  upload: {
    fenster: 0.0, //       App-Fenster kommt aus der Tiefe
    caption1: 0.35, //     „Drop in a CV."
    datei: 0.7, //         PDF erscheint, Cursor greift
    hover: 1.35, //        Datei über der Dropzone
    drop: 1.9, //          losgelassen
    analyse: 2.05, //      Aura und Fortschritt
    schritte: [2.7, 3.4, 4.1, 4.7], // Kontaktdaten, Erfahrung, Skills, Abgleich
    ergebnis: 5.0, //      Ergebnis-Karte poppt auf
    caption2: 5.2, //      „Skills and score in seconds."
    skills: 5.45, //       Skills einzeln
    score: 5.35, //        Score zählt auf 94
    stelle: 6.9, //        „Passt zu: Teamleitung Kundenservice"
    toast: 8.3, //         „Kandidat gespeichert"
  },
  scoring: {
    dashboard: 0.0,
    caption1: 0.3, //      „Every applicant, scored."
    zeilen: 0.55, //       Zeilen gestaffelt
    statistik: 0.8, //     Kennzahlen zählen
    hover: 2.6, //         Zeile 1 hervorgehoben
    zoom: 4.0, //          Kamera fährt auf die Karte
    caption2: 4.2, //      „AI summary at a glance."
    sheet: 4.3, //         Detail-Sheet fährt ein
    summary: 5.0, //       KI-Zusammenfassung
    marker: [5.7, 6.5, 7.3], // Schlüsselstellen werden markiert
    gruende: 6.1, //       „Warum dieser Kandidat passt"
    einladen: 8.3, //      Button „Zum Interview einladen" leuchtet auf
  },
  outro: {
    kacheln: 0.0, //       drei Feature-Kacheln
    zusammen: 1.1, //      laufen in der Mitte zusammen
    logo: 1.35,
    slogan: 2.2,
    cta: 2.8,
    schimmer: 3.9, //      Lichtkante läuft über den CTA
  },
} as const

/** Soundeffekte der Demo. */
export function demoSfx(): SfxCue[] {
  const c: SfxCue[] = []
  const add = (at: number, sound: SfxCue["sound"], volume: number) => c.push({ at, sound, volume })
  const U = DEMO_CUES.upload
  const S = DEMO_CUES.scoring
  add(sat("intro", DEMO_CUES.intro.zeile1), "whoosh", 0.3)
  add(sat("intro", DEMO_CUES.intro.meet), "whoosh", 0.45)
  add(sat("intro", DEMO_CUES.intro.logo), "thump", 0.7)
  add(sat("upload"), "whoosh", 0.6)
  add(sat("upload", U.datei), "click", 0.4)
  add(sat("upload", U.drop), "click", 0.6)
  for (const s of U.schritte) add(sat("upload", s), "tick", 0.5)
  add(sat("upload", U.ergebnis), "chime", 0.6)
  add(sat("scoring"), "whoosh", 0.6)
  for (let k = 0; k < 6; k++) add(sat("scoring", S.zeilen + k * 0.13), "click", 0.25)
  add(sat("scoring", S.hover), "click", 0.45)
  add(sat("scoring", S.zoom), "whoosh", 0.5)
  add(sat("scoring", S.sheet + 0.3), "chime", 0.45)
  for (const m of S.marker) add(sat("scoring", m), "tick", 0.45)
  add(sat("outro"), "whoosh", 0.6)
  add(sat("outro", DEMO_CUES.outro.logo), "thump", 0.75)
  add(sat("outro", DEMO_CUES.outro.cta), "chime", 0.4)
  add(sat("upload", U.toast), "click", 0.35)
  add(sat("scoring", S.einladen), "click", 0.35)
  return c
}

/** Sichtbare Ereignisse für die Lückenprüfung (höchstens 2 s Abstand). */
export function demoEvents(): { at: number; what: string }[] {
  const I = DEMO_CUES.intro
  const U = DEMO_CUES.upload
  const S = DEMO_CUES.scoring
  const O = DEMO_CUES.outro
  const e = (at: number, what: string) => ({ at, what })
  return [
    e(sat("intro", I.zeile1), "Zeile 1"),
    e(sat("intro", I.zeile1Ab), "Zeile 1 geht"),
    e(sat("intro", I.meet), "Meet"),
    e(sat("intro", I.logo), "Logo"),
    e(sat("upload") - HANDOFF / 2, "Übergang"),
    e(sat("upload", U.caption1), "Caption"),
    e(sat("upload", U.datei), "Datei"),
    e(sat("upload", U.drop), "Drop"),
    ...U.schritte.map((s) => e(sat("upload", s), "Analyse-Schritt")),
    e(sat("upload", U.ergebnis), "Ergebnis"),
    e(sat("upload", U.skills + 1.2), "letzter Skill"),
    e(sat("upload", U.stelle), "Stelle"),
    e(sat("upload", U.toast), "Toast"),
    e(sat("scoring") - HANDOFF / 2, "Übergang"),
    e(sat("scoring", S.zeilen), "Zeilen"),
    e(sat("scoring", S.statistik + 0.8), "Kennzahlen stehen"),
    e(sat("scoring", S.hover), "Hover"),
    e(sat("scoring", S.zoom), "Zoom"),
    e(sat("scoring", S.summary), "Zusammenfassung"),
    ...S.marker.map((m) => e(sat("scoring", m), "Marker")),
    e(sat("scoring", S.einladen), "Einladen"),
    e(sat("outro") - HANDOFF / 2, "Übergang"),
    e(sat("outro", O.zusammen), "Zusammenführung"),
    e(sat("outro", O.slogan), "Slogan"),
    e(sat("outro", O.cta), "CTA"),
    e(sat("outro", O.schimmer), "Schimmer"),
    e(SCENE.ende, "Ende"),
  ].sort((a, b) => a.at - b.at)
}
