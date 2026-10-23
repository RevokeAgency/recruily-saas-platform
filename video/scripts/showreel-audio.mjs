// Originalmusik für den Showreel, komplett im Code synthetisiert (keine Samples).
// 120 BPM, a-Moll, 20 s = 10 Takte, auf dasselbe Raster wie src/showreel/timing.ts:
//
//   Takt 0–1  Hook      Schläge auf den Wörtern, Fall von „oben.", Riser in den Drop
//   Takt 2–7  Features  Four-on-the-floor, Sidechain-Pad, Offbeat-Bass, ab Takt 4 Arpeggio
//   Takt 8    Kennzahl  Einschlag, Halbzeit, Snare-Roll und Riser
//   Takt 9    Logo      Einschlag, Schlussakkord, Glitzer auf dem CTA-Klick
//
//   node scripts/showreel-audio.mjs             →  public/showreel/music.wav (Stereo, 16 bit, 44,1 kHz)
//   node scripts/showreel-audio.mjs dashboard   →  public/showreel/dashboard/music.wav
//      eigene Variante für das Dashboard-Showreel: d-Moll, andere Akkordfolge,
//      anderes Arpeggio ab Takt 2, gleiches Raster
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"

const SR = 44100
const BPM = 120
const BEAT = 60 / BPM
const DUR = 20
const N = Math.round(DUR * SR)
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..")
const VARIANTS = {
  showreel: {
    out: "public/showreel/music.wav",
    seed: 120120,
    transpose: 0,
    bars: ["Am", "Am", "Am", "F", "C", "G", "Am", "F", "G", "Am9"],
    arp: [0, 2, 4, 1, 3, 5, 4, 2],
    arpFrom: 4,
    hook: [69, 76, 69, 69, 69],
  },
  dashboard: {
    out: "public/showreel/dashboard/music.wav",
    seed: 404040,
    transpose: 5,
    bars: ["Am", "Am", "F", "G", "Am", "C", "F", "G", "G", "Am9"],
    arp: [0, 3, 1, 4, 2, 5, 3, 1],
    arpFrom: 2,
    hook: [64, 67, 69, 72, 76],
  },
}
const V = VARIANTS[process.argv[2] ?? "showreel"]
if (!V) throw new Error(`Unbekannte Variante: ${process.argv[2]}`)
const OUT = path.join(ROOT, V.out)

const L = new Float32Array(N)
const R = new Float32Array(N)
const at = (beat) => beat * BEAT

let seed = V.seed
function rand() {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const noise = () => rand() * 2 - 1
const mtof = (m) => 440 * 2 ** ((m - 69) / 12)

/** Mono-Klang `buf` ab Sekunde `t0` einmischen, mit Lautstärke und Panorama (-1..1). */
function place(buf, t0, gain = 1, pan = 0, [dl, dr] = [L, R]) {
  const s0 = Math.round(t0 * SR)
  const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4) * Math.SQRT2
  const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4) * Math.SQRT2
  for (let i = 0; i < buf.length; i++) {
    const j = s0 + i
    if (j < 0 || j >= N) continue
    dl[j] += buf[i] * gl
    dr[j] += buf[i] * gr
  }
}

function render(seconds, fn) {
  const b = new Float32Array(Math.round(seconds * SR))
  for (let i = 0; i < b.length; i++) b[i] = fn(i / SR, i)
  return b
}

/** Einpoliger Tiefpass, Grenzfrequenz als Funktion der Zeit. Zweimal = 12 dB. */
function lowpass(buf, fc, passes = 1) {
  let out = buf
  for (let p = 0; p < passes; p++) {
    const o = new Float32Array(out.length)
    let y = 0
    for (let i = 0; i < out.length; i++) {
      const f = typeof fc === "function" ? fc(i / SR) : fc
      const a = 1 - Math.exp((-2 * Math.PI * f) / SR)
      y += a * (out[i] - y)
      o[i] = y
    }
    out = o
  }
  return out
}
const highpass = (buf, fc) => {
  const lp = lowpass(buf, fc)
  return buf.map((v, i) => v - lp[i])
}

// --- Schlagzeug -------------------------------------------------------------
function kick(punch = 1) {
  let ph = 0
  return render(0.45, (t) => {
    const f = 46 + 120 * Math.exp(-t * 32) * punch
    ph += (2 * Math.PI * f) / SR
    const body = Math.sin(ph) * Math.exp(-t * 7.5)
    const click = noise() * Math.exp(-t * 400) * 0.25
    return Math.tanh((body + click) * 1.6)
  })
}

function clap() {
  const n = highpass(render(0.3, () => noise()), 900)
  const bp = lowpass(n, 3200)
  return bp.map((v, i) => {
    const t = i / SR
    // drei kurze Stöße, dann Ausklang
    const bursts = [0, 0.011, 0.022].reduce((a, o) => a + (t >= o ? Math.exp(-(t - o) * 180) : 0), 0)
    return v * (bursts * 0.6 + Math.exp(-t * 16) * 0.55) * 2
  })
}

function hat(open = false) {
  const n = highpass(highpass(render(open ? 0.22 : 0.05, () => noise()), 7000), 7000)
  return n.map((v, i) => v * Math.exp((-i / SR) * (open ? 18 : 75)))
}

function snare() {
  const n = highpass(render(0.18, () => noise()), 1500)
  let ph = 0
  return n.map((v, i) => {
    const t = i / SR
    ph += (2 * Math.PI * 190) / SR
    return (v * 0.8 + Math.sin(ph) * 0.4) * Math.exp(-t * 26)
  })
}

/** Tiefer Einschlag mit Rauschfahne (Szenen-Downbeats). */
function impact() {
  let ph = 0
  const boom = render(2.2, (t) => {
    const f = 32 + 70 * Math.exp(-t * 6)
    ph += (2 * Math.PI * f) / SR
    return Math.sin(ph) * Math.exp(-t * 1.6)
  })
  const crash = lowpass(highpass(render(2.2, () => noise()), 2500), (t) => 12000 - 9000 * Math.min(1, t / 2))
  return boom.map((v, i) => Math.tanh(v * 1.4) + crash[i] * Math.exp((-i / SR) * 2.4) * 0.35)
}

/** Rausch-Riser: Filter öffnet sich bis zum Ziel. */
function riser(seconds) {
  const n = render(seconds, () => noise())
  return lowpass(highpass(n, 400), (t) => 300 + 9000 * (t / seconds) ** 2.2, 2).map((v, i) => v * ((i / SR / seconds) ** 1.6) * 2.2)
}

/** Fallender Ton für „oben." */
function fall(seconds) {
  let ph = 0
  return render(seconds, (t) => {
    const f = 1400 * Math.exp(-t * 5.5) + 80
    ph += (2 * Math.PI * f) / SR
    return (Math.sin(ph) * 0.6 + Math.sin(ph * 2.01) * 0.2) * Math.min(1, t / 0.01) * (1 - t / seconds)
  })
}

// --- Klänge -----------------------------------------------------------------
function saw(phase) {
  return 2 * (phase - Math.floor(phase + 0.5))
}

/** Supersaw-Akkord, `cut` = Filter (Hz oder Funktion), Hüllkurve mit weichem Anfang und Ende. */
function pad(notes, seconds, cut, detune = 0.12) {
  const voices = []
  for (const m of notes) for (const d of [-detune, 0, detune]) voices.push({ f: mtof(m + d), ph: rand() })
  const raw = render(seconds, (t) => {
    let v = 0
    for (const o of voices) {
      o.ph += o.f / SR
      v += saw(o.ph)
    }
    const env = Math.min(1, t / 0.04) * Math.min(1, (seconds - t) / 0.08)
    return (v / voices.length) * env
  })
  return lowpass(raw, cut, 2)
}

function pluck(m, seconds = 0.25, bright = 5000) {
  let ph = 0
  const raw = render(seconds, (t) => {
    ph += mtof(m) / SR
    return (saw(ph) * 0.6 + Math.sin(2 * Math.PI * ph) * 0.4) * Math.exp(-t * 16)
  })
  return lowpass(raw, (t) => 400 + bright * Math.exp(-t * 22), 2)
}

function bassNote(m, seconds) {
  let ph = 0
  const raw = render(seconds, (t) => {
    ph += mtof(m) / SR
    const env = Math.min(1, t / 0.005) * Math.exp(-t * 5) * Math.min(1, (seconds - t) / 0.02)
    return (saw(ph) * 0.55 + Math.sin(2 * Math.PI * ph) * 0.8) * env
  })
  return lowpass(raw, (t) => 180 + 1400 * Math.exp(-t * 14), 2)
}

function sub(m, seconds) {
  return render(seconds, (t) => Math.sin(2 * Math.PI * mtof(m) * t) * Math.min(1, t / 0.01) * Math.min(1, (seconds - t) / 0.05))
}

function shimmer() {
  const notes = [81, 84, 88, 93, 96].map((m) => m + V.transpose)
  return render(2.5, (t) => {
    let v = 0
    notes.forEach((m, k) => {
      const tk = t - k * 0.045
      if (tk > 0) v += Math.sin(2 * Math.PI * mtof(m) * tk) * Math.exp(-tk * 2.6) * (1 - k * 0.12)
    })
    return v * 0.5
  })
}

// --- Arrangement ------------------------------------------------------------
const CH = {
  Am: { pad: [57, 60, 64, 69], bass: 45 },
  F: { pad: [53, 57, 60, 65], bass: 41 },
  C: { pad: [55, 60, 64, 67], bass: 36 },
  G: { pad: [55, 59, 62, 67], bass: 43 },
  Am9: { pad: [57, 60, 64, 71], bass: 45 },
}
// Akkorde der Variante in ihre Tonart schieben
for (const c of Object.values(CH)) {
  c.pad = c.pad.map((m) => m + V.transpose)
  c.bass += V.transpose
}
const BARS = V.bars

// Bus für alles, was der Kick wegduckt
const duckL = new Float32Array(N)
const duckR = new Float32Array(N)
const placeDuck = (buf, t0, gain = 1, pan = 0) => place(buf, t0, gain, pan, [duckL, duckR])
const kicks = []

// Takt 0–1: Hook. Drohne, Schläge auf den fünf Wörtern
placeDuck(pad(CH.Am.pad, at(8), (t) => 300 + 500 * (t / at(8))), 0, 0.3)
placeDuck(sub(33 + V.transpose, at(5.5)), 0, 0.35)
for (const beat of [0, 1, 2, 3, 4]) {
  place(kick(1.3), at(beat), 0.95)
  kicks.push(at(beat))
  place(snare(), at(beat) + 0.002, beat === 4 ? 0.35 : 0.18)
  place(pluck(V.hook[beat] + V.transpose, 0.4, 7000), at(beat), 0.18, beat % 2 ? 0.4 : -0.4)
}
place(fall(0.55), at(5.5), 0.28)
place(impact(), at(6), 0.75)
kicks.push(at(6))
place(riser(at(1.75)), at(6.25), 0.35)
for (let k = 0; k < 12; k++) {
  const tt = at(6.5) + k * (at(1.5) / 12)
  if (tt < at(7.875)) place(snare(), tt, 0.08 + k * 0.022, k % 2 ? 0.2 : -0.2)
}

// Takt 2–7: Groove
for (let bar = 2; bar <= 7; bar++) {
  const t0 = at(bar * 4)
  const ch = CH[BARS[bar]]
  placeDuck(pad(ch.pad, at(4), 2600), t0, 0.3, -0.05)
  placeDuck(pad(ch.pad.map((m) => m + 12), at(4), 3400, 0.18), t0, 0.12, 0.25)
  placeDuck(sub(ch.bass - 12, at(4)), t0, 0.32)
  for (let beat = 0; beat < 4; beat++) {
    const tb = t0 + at(beat)
    place(kick(), tb, 0.9)
    kicks.push(tb)
    if (beat % 2 === 1) place(clap(), tb, 0.42, 0.05)
    place(hat(true), tb + at(0.5), 0.13, 0.3)
    placeDuck(bassNote(ch.bass, at(0.45)), tb + at(0.5), 0.5)
    if (bar >= 4) for (const s of [0.25, 0.75]) place(hat(false), tb + at(s), 0.06, -0.35)
  }
  // Arpeggio ab Takt 4, mit gepunkteter Achtel als Echo
  if (bar >= V.arpFrom) {
    const notes = [...ch.pad, ch.pad[1] + 12, ch.pad[2] + 12]
    const seq = V.arp
    for (let s = 0; s < 16; s++) {
      const n = notes[seq[s % seq.length]] + 12
      const ts = t0 + at(s * 0.25)
      place(pluck(n, 0.22, 4200), ts, 0.075, s % 2 ? 0.45 : -0.45)
      place(pluck(n, 0.22, 2500), ts + at(0.75), 0.03, s % 2 ? -0.6 : 0.6)
    }
  }
  // Stab auf dem ersten Schlag jedes zweiten Takts
  if (bar % 2 === 0) place(pad(ch.pad.map((m) => m + 12), 0.35, (t) => 800 + 6000 * Math.exp(-t * 10), 0.2), t0, 0.32)
}
// kleiner Swell in jeden Szenenwechsel mitten im Groove
for (const beat of [14, 20, 26]) place(riser(at(1)), at(beat - 1), 0.16)
place(impact(), at(8), 0.6)

// Takt 8: Kennzahl. Einschlag, Halbzeit, Snare-Roll in den Logo-Einschlag
place(impact(), at(32), 0.9)
kicks.push(at(32))
placeDuck(pad(CH.G.pad, at(4), (t) => 500 + 3000 * (t / at(4)) ** 2), at(32), 0.45)
placeDuck(sub(CH.G.bass - 12, at(4)), at(32), 0.3)
for (const beat of [32, 34]) {
  place(kick(), at(beat), 0.9)
  kicks.push(at(beat))
}
place(clap(), at(33), 0.38)
place(riser(at(2)), at(34), 0.38)
for (let k = 0; k < 16; k++) {
  const tt = at(34) + k * at(0.125)
  place(snare(), tt, 0.06 + k * 0.016, k % 2 ? 0.25 : -0.25)
}

// Takt 9: Logo. Einschlag, Schlussakkord, Glitzer auf dem CTA-Klick (Schlag 38,5)
place(impact(), at(36), 0.85)
placeDuck(pad(CH.Am9.pad, at(4), 3000), at(36), 0.5)
placeDuck(pad(CH.Am9.pad.map((m) => m + 12), at(4), 4200, 0.2), at(36), 0.16, 0.3)
placeDuck(sub(CH.Am9.bass - 12, at(4)), at(36), 0.32)
for (const beat of [36, 37, 38, 39]) {
  place(kick(), at(beat), beat === 36 ? 1 : 0.7)
  kicks.push(at(beat))
  place(hat(true), at(beat + 0.5), 0.1, 0.3)
}
place(clap(), at(37), 0.35)
place(clap(), at(39), 0.3)
place(shimmer(), at(38.5), 0.22, 0.15)
for (const [k, m] of [69, 72, 76, 81].entries()) place(pluck(m + V.transpose, 0.6, 6000), at(38.5) + k * 0.03, 0.1, (k - 1.5) * 0.3)

// Sidechain: der Pad-Bus duckt auf jedem Kick
const duck = new Float32Array(N).fill(1)
for (const k of kicks) {
  const s0 = Math.round(k * SR)
  for (let i = 0; i < Math.round(0.4 * SR) && s0 + i < N; i++) {
    const g = 1 - 0.78 * Math.exp((-i / SR) * 11)
    duck[s0 + i] = Math.min(duck[s0 + i], g)
  }
}
for (let i = 0; i < N; i++) {
  L[i] += duckL[i] * duck[i]
  R[i] += duckR[i] * duck[i]
}

// Kurze Stille vor dem Drop (letztes Sechzehntel vor Schlag 8)
for (let i = Math.round(at(7.75) * SR); i < Math.round(at(8) * SR) - 64; i++) {
  L[i] *= 0.08
  R[i] *= 0.08
}

// Raum: einfacher Schroeder-Hall, links und rechts mit leicht anderen Längen
function reverb(input, combs, mix = 0.18) {
  const out = new Float32Array(input.length)
  for (const len of combs) {
    const buf = new Float32Array(len)
    let p = 0
    let lp = 0
    for (let i = 0; i < input.length; i++) {
      const y = buf[p]
      lp = lp + 0.35 * (y - lp)
      buf[p] = input[i] + lp * 0.8
      out[i] += y / combs.length
      p = (p + 1) % len
    }
  }
  for (const len of [556, 441]) {
    const buf = new Float32Array(len)
    let p = 0
    for (let i = 0; i < out.length; i++) {
      const b = buf[p]
      const y = -out[i] + b
      buf[p] = out[i] + b * 0.5
      out[i] = y
      p = (p + 1) % len
    }
  }
  return input.map((v, i) => v + out[i] * mix)
}
const wetL = reverb(L, [1557, 1617, 1491, 1422])
const wetR = reverb(R, [1580, 1640, 1514, 1445])

// Ausklang in den letzten 0,4 s, sanfte Sättigung, Normalisierung auf -1 dBFS
const fadeFrom = Math.round((DUR - 0.4) * SR)
let peak = 0
for (let i = 0; i < N; i++) {
  const f = i > fadeFrom ? 1 - (i - fadeFrom) / (N - fadeFrom) : 1
  wetL[i] = Math.tanh(wetL[i] * 0.9) * f
  wetR[i] = Math.tanh(wetR[i] * 0.9) * f
  peak = Math.max(peak, Math.abs(wetL[i]), Math.abs(wetR[i]))
}
const gain = 0.89 / peak

const data = Buffer.alloc(N * 4)
for (let i = 0; i < N; i++) {
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, wetL[i] * gain)) * 32767), i * 4)
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, wetR[i] * gain)) * 32767), i * 4 + 2)
}
const header = Buffer.alloc(44)
header.write("RIFF", 0)
header.writeUInt32LE(36 + data.length, 4)
header.write("WAVE", 8)
header.write("fmt ", 12)
header.writeUInt32LE(16, 16)
header.writeUInt16LE(1, 20)
header.writeUInt16LE(2, 22)
header.writeUInt32LE(SR, 24)
header.writeUInt32LE(SR * 4, 28)
header.writeUInt16LE(4, 32)
header.writeUInt16LE(16, 34)
header.write("data", 36)
header.writeUInt32LE(data.length, 40)
mkdirSync(path.dirname(OUT), { recursive: true })
writeFileSync(OUT, Buffer.concat([header, data]))
console.log(`${path.relative(ROOT, OUT)}  ${DUR} s, ${BPM} BPM, Spitze vor Normalisierung ${peak.toFixed(2)}`)
