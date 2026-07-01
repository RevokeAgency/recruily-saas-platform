"use client"

import { useEffect, useRef } from "react"

/**
 * Adds `.in` (and `.visible`, kept as an alias for pre-port components) to
 * elements with `.reveal`, `.reveal-left`, or `.reveal-right` when they
 * scroll into view. Direction is read straight off `data-dir="left|right|scale"`
 * by CSS — this hook only needs to flip the reveal class. Stagger is CSS-driven
 * via `.s1`-`.s5`; `data-delay` (ms) remains supported for callers that need a
 * one-off JS delay instead.
 */
export function useReveal() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = ref.current ?? document
    const els = Array.from(
      root.querySelectorAll<HTMLElement>(".reveal, .reveal-left, .reveal-right"),
    )

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement
            const delay = el.dataset.delay ? Number.parseInt(el.dataset.delay, 10) : 0
            window.setTimeout(() => el.classList.add("in", "visible"), delay)
            observer.unobserve(el)
          }
        })
      },
      { threshold: 0.16, rootMargin: "0px 0px -60px 0px" },
    )

    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return ref
}
