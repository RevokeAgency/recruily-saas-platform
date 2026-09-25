"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Zählt einmalig bis `target` hoch, sobald `active` true wird.
 *
 * Ohne laufende Animation liefert der Hook immer `target`. Das ist der
 * entscheidende Punkt: Früher startete der Zustand bei 0, und genau diese 0
 * stand dann im serverseitigen HTML. Suchmaschinen, Vorschau-Crawler und alle
 * Besucher ohne JavaScript sahen „0/100" statt des echten Werts, und bei
 * reduzierter Bewegung blieb die Zahl bis zum Hydrieren falsch.
 *
 * Jetzt trägt das HTML den Endwert, und das Hochzählen ist reine Verbesserung
 * im Client. Bei `prefers-reduced-motion` entfällt es ganz.
 *
 * Ändert sich `target` später (etwa wenn im Dashboard Daten nachladen), folgt
 * der Rückgabewert direkt, ohne erneut von 0 zu zählen.
 *
 * `from` und `delay` sind für erklärende Animationen: Die Gesprächskarte der
 * Landing Page zählt vom Analysewert zum Match. Beim Aktivieren springt der
 * Wert sofort auf `from` (die Karte blendet in diesem Moment noch ein) und
 * zählt nach `delay` Millisekunden los.
 */
export function useCountUp(target: number, active: boolean, duration = 1500, from = 0, delay = 0) {
  const [frame, setFrame] = useState<number | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (!active || started.current) return
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return
    started.current = true

    let finished = false
    let raf = 0
    let timer = 0
    let start = 0
    const tick = (now: number) => {
      if (!start) start = now
      const p = Math.min((now - start) / duration, 1)
      if (p >= 1) {
        finished = true
        setFrame(null)
        return
      }
      setFrame(Math.round(from + (1 - Math.pow(1 - p, 3)) * (target - from)))
      raf = requestAnimationFrame(tick)
    }
    setFrame(from)
    timer = window.setTimeout(() => { raf = requestAnimationFrame(tick) }, delay)

    return () => {
      window.clearTimeout(timer)
      cancelAnimationFrame(raf)
      // Unterbrochen, bevor die Animation durch war (Strict Mode, neues
      // Ziel): Zustand zurücksetzen, damit der nächste Lauf sauber startet
      // statt auf einem Zwischenwert stehen zu bleiben.
      if (!finished) {
        started.current = false
        setFrame(null)
      }
    }
  }, [target, active, duration, from, delay])

  return frame ?? target
}
