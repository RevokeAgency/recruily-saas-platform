"use client"

import { useEffect, useRef } from "react"

/**
 * Adds the `visible` class to elements with `.reveal`, `.reveal-left`,
 * or `.reveal-right` when they scroll into view. Supports staggered
 * children via the `data-stagger` attribute (ms per index).
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
            window.setTimeout(() => el.classList.add("visible"), delay)
            observer.unobserve(el)
          }
        })
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" },
    )

    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return ref
}
