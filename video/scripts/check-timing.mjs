// Prüft die Timing-Konfiguration, bevor gerendert wird:
//   - Marker aufsteigend und innerhalb der Videolänge
//   - nie mehr als 2 s ohne neues sichtbares Ereignis
//   - alle Soundeffekte innerhalb der Videolänge
//
//   node scripts/check-timing.mjs
import { DURATION, MARKERS, sfxCues, visualEvents } from "../src/config/timing.ts"

const MAX_GAP = 2
let ok = true
const fail = (msg) => {
  ok = false
  console.error("✗ " + msg)
}

const entries = Object.entries(MARKERS)
entries.forEach(([name, sec], i) => {
  if (sec < 0 || sec > DURATION) fail(`Marker ${name} (${sec} s) liegt außerhalb von 0–${DURATION} s`)
  if (i > 0 && sec < entries[i - 1][1]) fail(`Marker ${name} (${sec} s) liegt vor ${entries[i - 1][0]}`)
})

const ev = visualEvents()
for (let i = 1; i < ev.length; i++) {
  const gap = ev[i].at - ev[i - 1].at
  if (gap > MAX_GAP + 1e-9) {
    fail(`Loch von ${gap.toFixed(2)} s: ${ev[i - 1].at.toFixed(2)} s „${ev[i - 1].what}" → ${ev[i].at.toFixed(2)} s „${ev[i].what}"`)
  }
}

for (const c of sfxCues()) {
  if (c.at < 0 || c.at > DURATION) fail(`SFX ${c.sound} bei ${c.at} s liegt außerhalb des Videos`)
}

if (ok) {
  const maxGap = Math.max(...ev.slice(1).map((e, i) => e.at - ev[i].at))
  console.log(`✓ ${entries.length} Marker, ${ev.length} Ereignisse, größte Lücke ${maxGap.toFixed(2)} s, ${sfxCues().length} Soundeffekte`)
} else {
  process.exit(1)
}
