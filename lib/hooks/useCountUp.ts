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
 */
export function useCountUp(target: number, active: boolean, duration = 1500) {
  const [frame, setFrame] = useState<number | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (!active || started.current) return
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return
    started.current = true

    let finished = false
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      if (p >= 1) {
        finished = true
        setFrame(null)
        return
      }
      setFrame(Math.round((1 - Math.pow(1 - p, 3)) * target))
      raf = requestAnimationFrame(tick)
    }
    setFrame(0)
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      // Unterbrochen, bevor die Animation durch war (Strict Mode, neues
      // Ziel): Zustand zurücksetzen, damit der nächste Lauf sauber startet
      // statt auf einem Zwischenwert stehen zu bleiben.
      if (!finished) {
        started.current = false
        setFrame(null)
      }
    }
  }, [target, active, duration])

  return frame ?? target
}
