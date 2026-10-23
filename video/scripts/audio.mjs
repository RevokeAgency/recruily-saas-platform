// Erzeugt das SFX-Kit und die Platzhalter-Musik als 16-bit-WAV (mono, 44,1 kHz).
// Keine Downloads, keine Abhängigkeiten, deterministisch (fester Seed).
//
//   node scripts/audio.mjs
//
// public/sfx/whoosh.wav   Schnitte und große Bewegungen
// public/sfx/click.wav    Kartenauftritte
// public/sfx/thump.wav    harte Schnitte (4 s, 24 s)
// public/sfx/tick.wav     Zähler
// public/sfx/chime.wav    Aufklappen der Begründung
// public/music/platzhalter.wav   30 s Pad + Kick, 120 BPM, bis die echte Musik kommt
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"

const RATE = 44100
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..")

// --- Werkzeuge -------------------------------------------------------------
let seed = 20261023
function rand() {
  // Mulberry32
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const noise = () => rand() * 2 - 1

function buffer(seconds) {
  return new Float32Array(Math.round(seconds * RATE))
}

function writeWav(file, samples, peak = 0.89) {
  let max = 0
  for (const s of samples) max = Math.max(max, Math.abs(s))
  const gain = max > 0 ? peak / max : 1
  const data = Buffer.alloc(samples.length * 2)
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i] * gain))
    data.writeInt16LE(Math.round(v * 32767), i * 2)
  }
  const header = Buffer.alloc(44)
  header.write("RIFF", 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write("WAVE", 8)
  header.write("fmt ", 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20) // PCM
  header.writeUInt16LE(1, 22) // mono
  header.writeUInt32LE(RATE, 24)
  header.writeUInt32LE(RATE * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write("data", 36)
  header.writeUInt32LE(data.length, 40)
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, Buffer.concat([header, data]))
  console.log(`${path.relative(ROOT, file)}  ${(samples.length / RATE).toFixed(2)} s`)
}

/** Einpoliger Tiefpass mit zeitabhängiger Grenzfrequenz. */
function lowpass(input, cutoffAt) {
  const out = new Float32Array(input.length)
  let y = 0
  for (let i = 0; i < input.length; i++) {
    const fc = cutoffAt(i / RATE)
    const a = 1 - Math.exp((-2 * Math.PI * fc) / RATE)
    y += a * (input[i] - y)
    out[i] = y
  }
  return out
}

/** Hochpass als Differenz zum Tiefpass. */
function highpass(input, fc) {
  const lp = lowpass(input, () => fc)
  return input.map((v, i) => v - lp[i])
}

const smooth = (x) => x * x * (3 - 2 * x)

// --- SFX -------------------------------------------------------------------
function whoosh() {
  const dur = 0.7
  const b = buffer(dur)
  for (let i = 0; i < b.length; i++) b[i] = noise()
  // Grenzfrequenz schwillt an und ab, Hüllkurve mit Spitze bei 40 %
  const f = lowpass(highpass(b, 180), (t) => 300 + 5200 * Math.sin(Math.PI * Math.min(1, t / dur)) ** 2)
  return f.map((v, i) => {
    const t = i / b.length
    const env = t < 0.4 ? smooth(t / 0.4) : Math.pow(1 - (t - 0.4) / 0.6, 2.2)
    return v * env
  })
}

function click() {
  const b = buffer(0.07)
  const n = highpass(b.map(() => noise()), 2500)
  return b.map((_, i) => {
    const t = i / RATE
    return (n[i] * 0.6 + Math.sin(2 * Math.PI * 1900 * t) * 0.5) * Math.exp(-t * 90)
  })
}

function thump() {
  const b = buffer(1.0)
  let phase = 0
  return b.map((_, i) => {
    const t = i / RATE
    const f = 38 + 92 * Math.exp(-t * 14) // 130 Hz → 38 Hz
    phase += (2 * Math.PI * f) / RATE
    const body = Math.sin(phase) * Math.exp(-t * 4.2) * Math.min(1, t / 0.004)
    const transient = noise() * Math.exp(-t * 160) * 0.35
    return body + transient
  })
}

function tick() {
  const b = buffer(0.035)
  return b.map((_, i) => {
    const t = i / RATE
    return Math.sin(2 * Math.PI * 3400 * t) * Math.exp(-t * 180) * Math.min(1, t / 0.0008)
  })
}

function chime() {
  const b = buffer(1.8)
  const partials = [
    [880, 1.0],
    [882.5, 0.6],
    [1320, 0.45],
    [1760, 0.22],
    [2640, 0.08],
  ]
  return b.map((_, i) => {
    const t = i / RATE
    let v = 0
    for (const [f, a] of partials) v += Math.sin(2 * Math.PI * f * t) * a * Math.exp(-t * (2.2 + f / 1400))
    return v * Math.min(1, t / 0.012)
  })
}

// --- Platzhalter-Musik ------------------------------------------------------
// 120 BPM, ein Schlag alle 0,5 s. Pad die ganze Zeit; Kick ab 4 s (Akt 2),
// halbiert ab 24 s (Payoff), weiche Hi-Hats auf den Offbeats in Akt 3.
function music() {
  const dur = 30
  const bpm = 120
  const beat = 60 / bpm
  const b = buffer(dur)

  // Pad: Am9-Fläche aus verstimmten Sinustönen, langsam atmend
  const chord = [110, 164.81, 196, 246.94, 329.63]
  for (let i = 0; i < b.length; i++) {
    const t = i / RATE
    let v = 0
    chord.forEach((f, k) => {
      const lfo = 1 + 0.25 * Math.sin(2 * Math.PI * (0.11 + k * 0.03) * t)
      v += (Math.sin(2 * Math.PI * f * t) + Math.sin(2 * Math.PI * f * 1.004 * t)) * 0.5 * lfo
    })
    const swell = Math.min(1, t / 2.5)
    b[i] = v * 0.06 * swell
  }

  // Kick
  const k = thump()
  const kickAt = []
  for (let t = 4; t < dur - 0.01; t += beat) {
    if (t >= 24 && Math.round((t - 24) / beat) % 2 === 1) continue
    kickAt.push(t)
  }
  for (const t0 of kickAt) {
    const start = Math.round(t0 * RATE)
    for (let j = 0; j < k.length && start + j < b.length; j++) b[start + j] += k[j] * 0.32
  }

  // Hi-Hats in Akt 3
  const hat = highpass(buffer(0.05).map(() => noise()), 6000)
  for (let t = 11 + beat / 2; t < 24; t += beat) {
    const start = Math.round(t * RATE)
    for (let j = 0; j < hat.length; j++) b[start + j] += hat[j] * Math.exp((-j / RATE) * 70) * 0.05
  }

  // Ausblenden in der letzten Sekunde
  for (let i = 0; i < b.length; i++) {
    const t = i / RATE
    if (t > dur - 1) b[i] *= Math.max(0, dur - t)
  }
  return b
}

const sfx = path.join(ROOT, "public", "sfx")
writeWav(path.join(sfx, "whoosh.wav"), whoosh())
writeWav(path.join(sfx, "click.wav"), click(), 0.7)
writeWav(path.join(sfx, "thump.wav"), thump())
writeWav(path.join(sfx, "tick.wav"), tick(), 0.5)
writeWav(path.join(sfx, "chime.wav"), chime(), 0.7)
writeWav(path.join(ROOT, "public", "music", "platzhalter.wav"), music(), 0.8)
