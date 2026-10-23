/**
 * ZENTRALE TIMING-KONFIGURATION
 *
 * Alle Zeiten in Sekunden. Umgerechnet in Frames wird ausschließlich über
 * useVideoConfig().fps (siehe lib/time.ts), nirgends stehen feste Framezahlen.
 *
 * MARKERS   Akt- und Szenengrenzen. Auf den Beat schieben: Wert ändern, alles
 *           was daran hängt (Bewegungen, Texte, SFX) wandert mit. Mit snap()
 *           lässt sich ein Wert auf den nächsten Schlag legen.
 * CUES      Ereignisse innerhalb einer Szene, relativ zum jeweiligen Marker.
 * SFX       Soundeffekte, ebenfalls relativ zu Markern.
 * MUSIC     Musik-Slot.
 */

export const FPS = 30
export const DURATION = 30

/** Tempo der Musik. Platzhalter: 120 BPM, ein Schlag alle 0,5 s. */
export const BPM = 120
export const BEAT = 60 / BPM

/** Legt eine Zeit auf den nächstgelegenen Schlag. */
export function snap(seconds: number, beat = BEAT): number {
  return Math.round(seconds / beat) * beat
}

export const MARKERS = {
  // AKT 1 — HOOK
  hook: 0, //          schwarz
  frage: 0.5, //       die Frage baut sich Wort für Wort auf
  // AKT 2 — DAS PROBLEM
  problem: 4, //       harter Schnitt, Karten fallen
  rueckfahrt: 6, //    Kamera fährt zurück, 20 Stunden
  zerfall: 8, //       Stapel kippt und fällt auseinander
  // AKT 3 — DAS PRODUKT
  scan: 11, //         Raster im ganzen Bild, Scan-Linie
  liste: 13, //        Raster kollabiert zur Rangliste
  detail: 19, //       Zoom auf Platz 1, Begründung klappt auf
  // AKT 4 — PAYOFF
  payoff: 24, //       harter Schnitt auf die Totale, drei bleiben
  logo: 27, //         Logo baut sich auf
  ende: 30,
} as const

export type Marker = keyof typeof MARKERS

/** Absolute Zeit: Marker + Offset. */
export function at(marker: Marker, offset = 0): number {
  return MARKERS[marker] + offset
}

/** Abstand zwischen gestaffelten Elementen (~4 Frames bei 30 fps). */
export const STAGGER = 0.13

export const CUES = {
  frage: {
    marker: 1.9, //         Cyan-Strich unter „wirklich"
    dimmen: 2.6, //         Rest der Frage tritt zurück
  },
  problem: {
    kartenStart: 0.05, //   erste Karte landet
    kartenDauer: 1.7, //    bis zur 80. Karte
  },
  rueckfahrt: {
    rechnung: 0.0, //       „× 15 Minuten" kommt dazu
    stunden: 0.35, //       Ziffern rollen auf 20
    stundenWort: 0.95, //   „Stunden." landet
  },
  zerfall: {
    kippen: 0.0,
    text: 0.45, //          „Gründlich gelesen werden die wenigsten."
    zweiteWelle: 1.2, //    weitere Karten rutschen raus
    rest: 1.9, //           die letzten drei richten sich auf
  },
  scan: {
    linieStart: 0.25,
    linieEnde: 1.75,
    text: 0.3, //           „Revetly liest alle."
  },
  liste: {
    zeilen: 0.55, //        Zeilen landen
    text: 1.0, //           „Sortiert nach Passung."
    tausch1: 1.8,
    tausch2: 3.2,
    raenge: 3.9, //         Ränge zählen 1 … n
    fuss: 4.6, //           „+ 73 weitere …", Glow auf Platz 1
  },
  detail: {
    aufklappen: 0.35,
    text: 0.6, //           „Jeder Punkt belegt."
    belege: 0.9, //         erstes Kriterium
    belegAbstand: 0.5, //   Abstand der Kriterien
    weitere: 3.4, //        übrige Kriterien als Chips
  },
  payoff: {
    verblassen: 0.15, //    77 Karten gehen
    dreiRuecken: 0.55, //   drei rücken in die Mitte
    text1: 0.8, //          „Du entscheidest über drei Profile."
    text2: 1.6, //          „Nicht über achtzig."
  },
  logo: {
    abgang: 0.0, //         Payoff geht
    badge: 0.2,
    r: 0.55, //             Bauteile des R
    wortmarke: 0.75, //     Buchstaben gestaffelt
    tagline: 1.5,
    cta: 1.95,
  },
} as const

/** Landezeit (absolut) der i-ten von n Bewerbungskarten: anfangs mit Abstand, dann dichter. */
export function cardLandTime(i: number, n: number): number {
  const { kartenStart, kartenDauer } = CUES.problem
  return at("problem", kartenStart + kartenDauer * Math.pow(i / (n - 1), 0.6))
}

export type SfxName = "whoosh" | "click" | "thump" | "tick" | "chime"

export interface SfxCue {
  /** absolute Sekunde, zu der das Bild-Ereignis passiert */
  at: number
  sound: SfxName
  volume: number
}

/** Ton setzt so viele Sekunden vor dem Bild ein (früh wirkt synchron, spät wirkt kaputt). */
export const SFX_LEAD = 0.07

/** Alle Soundeffekte. Hängen an Markern, wandern also mit. */
export function sfxCues(): SfxCue[] {
  const c: SfxCue[] = []
  const add = (time: number, sound: SfxName, volume: number) => c.push({ at: time, sound, volume })

  // Akt 1
  add(at("frage"), "whoosh", 0.25)
  add(at("frage", CUES.frage.marker), "click", 0.35)
  // Akt 2
  add(at("problem"), "thump", 1)
  for (let i = 0; i < 6; i++) add(cardLandTime(i, 80), "click", 0.45)
  for (let k = 10; k <= 80; k += 10) add(cardLandTime(k - 1, 80), "tick", 0.5)
  add(at("rueckfahrt"), "whoosh", 0.4)
  for (let k = 0; k < 4; k++) add(at("rueckfahrt", CUES.rueckfahrt.stunden + k * 0.12), "tick", 0.45)
  add(at("zerfall"), "whoosh", 0.7)
  add(at("zerfall", CUES.zerfall.zweiteWelle), "whoosh", 0.35)
  // Akt 3
  add(at("scan"), "whoosh", 0.6)
  add(at("scan", CUES.scan.linieStart), "whoosh", 0.3)
  add(at("liste"), "whoosh", 0.55)
  add(at("liste", CUES.liste.tausch1), "click", 0.5)
  add(at("liste", CUES.liste.tausch2), "click", 0.5)
  for (let k = 0; k < 7; k++) add(at("liste", CUES.liste.raenge + k * STAGGER), "tick", 0.4)
  add(at("detail"), "whoosh", 0.4)
  add(at("detail", CUES.detail.aufklappen), "chime", 0.6)
  for (let k = 0; k < 3; k++) add(at("detail", CUES.detail.belege + k * CUES.detail.belegAbstand), "click", 0.35)
  // Akt 4
  add(at("payoff"), "thump", 1)
  add(at("payoff", CUES.payoff.verblassen), "whoosh", 0.3)
  add(at("payoff", CUES.payoff.dreiRuecken), "click", 0.45)
  add(at("logo"), "whoosh", 0.55)
  add(at("logo", CUES.logo.badge), "thump", 0.5)
  add(at("logo", CUES.logo.tagline), "chime", 0.45)
  return c
}

/**
 * Musik-Slot. Eigene Datei nach public/music/ legen und hier eintragen.
 * Bis dahin läuft der synthetische Platzhalter (scripts/audio.mjs).
 */
export const MUSIC = {
  src: "music/platzhalter.wav" as string | null,
  /** Sekunden, die am Anfang der Datei übersprungen werden. */
  trimStart: 0,
  volume: 0.28,
  fadeIn: 0.2,
  fadeOut: 1.2,
}

/**
 * Sichtbare Ereignisse für die Lückenprüfung (scripts/check-timing.mjs):
 * Zwischen zwei aufeinanderfolgenden Einträgen dürfen höchstens 2 s liegen.
 */
export function visualEvents(): { at: number; what: string }[] {
  const e = (time: number, what: string) => ({ at: time, what })
  const list = [
    e(at("hook"), "Schwarz"),
    e(at("frage"), "erstes Wort"),
    e(at("frage", 6 * STAGGER), "letztes Wort"),
    e(at("frage", CUES.frage.marker), "Strich unter „wirklich“"),
    e(at("frage", CUES.frage.dimmen), "Frage tritt zurück"),
    e(at("problem"), "Schnitt, Karten fallen"),
    e(at("problem", CUES.problem.kartenStart + CUES.problem.kartenDauer), "80. Karte"),
    e(at("rueckfahrt", CUES.rueckfahrt.rechnung), "Kamera zurück, × 15 Minuten"),
    e(at("rueckfahrt", CUES.rueckfahrt.stunden), "Ziffern rollen"),
    e(at("rueckfahrt", CUES.rueckfahrt.stundenWort), "Stunden."),
    e(at("zerfall"), "Stapel kippt"),
    e(at("zerfall", CUES.zerfall.text), "Text"),
    e(at("zerfall", CUES.zerfall.zweiteWelle), "zweite Welle"),
    e(at("zerfall", CUES.zerfall.rest), "Rest richtet sich auf"),
    e(at("scan"), "Schnitt, Raster"),
    e(at("scan", CUES.scan.linieStart), "Scan-Linie"),
    e(at("scan", CUES.scan.linieEnde), "Scan fertig"),
    e(at("liste"), "Kollaps"),
    e(at("liste", CUES.liste.zeilen), "Zeilen"),
    e(at("liste", CUES.liste.text), "Text"),
    e(at("liste", CUES.liste.tausch1), "Tausch 1"),
    e(at("liste", CUES.liste.tausch2), "Tausch 2"),
    e(at("liste", CUES.liste.raenge), "Ränge"),
    e(at("liste", CUES.liste.fuss), "Fußzeile, Platz 1"),
    e(at("detail"), "Zoom"),
    e(at("detail", CUES.detail.aufklappen), "Aufklappen"),
    e(at("detail", CUES.detail.belege), "Kriterium 1"),
    e(at("detail", CUES.detail.belege + 2 * CUES.detail.belegAbstand), "Kriterium 3"),
    e(at("detail", CUES.detail.weitere), "übrige Kriterien"),
    e(at("payoff"), "Schnitt, Totale"),
    e(at("payoff", CUES.payoff.verblassen), "77 gehen"),
    e(at("payoff", CUES.payoff.dreiRuecken), "drei rücken"),
    e(at("payoff", CUES.payoff.text2), "Nicht über achtzig."),
    e(at("logo", CUES.logo.badge), "Badge"),
    e(at("logo", CUES.logo.wortmarke), "Wortmarke"),
    e(at("logo", CUES.logo.tagline), "Tagline"),
    e(at("logo", CUES.logo.cta), "CTA"),
    e(at("ende"), "Ende"),
  ]
  return list.sort((a, b) => a.at - b.at)
}
