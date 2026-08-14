"use client"

import { useEffect, useRef } from "react"

/**
 * Adds `.in` (and `.visible`, kept as an alias for pre-port components) to
 * elements with `.reveal`, `.reveal-left`, or `.reveal-right` when they
 * scroll into view. Direction is read straight off `data-dir="left|right|scale"`
 * by CSS — this hook only needs to flip the reveal class. Stagger is CSS-driven
 * via `.s1`-`.s5`; `data-delay` (ms) remains supported for callers that need a
 * one-off JS delay instead.
 *
 * ── Warum die Schwelle bei 0 beginnt ────────────────────────────────────────
 * Die Schwelle bezieht sich auf die Fläche des BEOBACHTETEN Elements, nicht auf
 * den Bildschirm. Mit dem früheren Wert 0.16 musste ein Sechstel des Elements
 * gleichzeitig sichtbar sein. Bei einer Karte kein Problem, bei einem Container
 * um eine ganze Kandidatenliste schon: Ist die Liste 5000 Pixel hoch und der
 * sichtbare Bereich 800, sind das 16 Prozent knapp verfehlt. Der Beobachter
 * löste nie aus, und die Liste blieb dauerhaft auf opacity 0 stehen. Sichtbar
 * wurde sie erst nach einem Klick auf „Aktualisieren", weil die Liste dabei
 * kurz durch das kurze Skelett ersetzt wurde und die Schwelle dann passte.
 *
 * Deshalb jetzt [0, 0.16]: Kleine Elemente verhalten sich wie bisher, große
 * lösen aus, sobald sie überhaupt im Bild sind. Inhalte, die wegen einer
 * Animation unsichtbar bleiben, sind der schlimmste Fehlerfall — der Nutzer
 * hält die Anwendung für kaputt und hat keinen Anhaltspunkt.
 */
export function useReveal() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = ref.current ?? document
    const select = ".reveal, .reveal-left, .reveal-right"

    const zeigen = (el: HTMLElement, delay = 0) => {
      if (delay > 0) window.setTimeout(() => el.classList.add("in", "visible"), delay)
      else el.classList.add("in", "visible")
    }

    // Wer Bewegung reduziert haben will, bekommt den Inhalt sofort.
    const reduziert = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    if (reduziert) {
      root.querySelectorAll<HTMLElement>(select).forEach((el) => zeigen(el))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const el = entry.target as HTMLElement
          const delay = el.dataset.delay ? Number.parseInt(el.dataset.delay, 10) : 0
          zeigen(el, delay)
          observer.unobserve(el)
        })
      },
      { threshold: [0, 0.16], rootMargin: "0px 0px -60px 0px" },
    )

    const beobachten = () => {
      root.querySelectorAll<HTMLElement>(select).forEach((el) => {
        if (!el.classList.contains("in")) observer.observe(el)
      })
    }
    beobachten()

    // Nachgereichte Inhalte (Listen laden asynchron) ebenfalls erfassen.
    const mo = new MutationObserver(beobachten)
    if (ref.current) mo.observe(ref.current, { childList: true, subtree: true })

    // Letzte Absicherung, bewusst nur für den sichtbaren Bereich: Was im Bild
    // steht und trotzdem noch versteckt ist, wird gezeigt. Alles unterhalb des
    // Bildschirms bleibt in Ruhe, sonst würde die Landing Page nach kurzer Zeit
    // einfach komplett aufpoppen, statt beim Scrollen zu erscheinen.
    const notbremse = window.setTimeout(() => {
      root.querySelectorAll<HTMLElement>(select).forEach((el) => {
        if (el.classList.contains("in")) return
        const r = el.getBoundingClientRect()
        if (r.top < window.innerHeight && r.bottom > 0) zeigen(el)
      })
    }, 1200)

    return () => {
      observer.disconnect()
      mo.disconnect()
      window.clearTimeout(notbremse)
    }
  }, [])

  return ref
}
