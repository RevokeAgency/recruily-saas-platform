"use client"

import { useEffect, useRef } from "react"

export function useReveal(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible")
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15, ...options }
    )

    const children = el.querySelectorAll(".reveal, .reveal-left, .reveal-right")
    children.forEach((child) => observer.observe(child))
    if (el.classList.contains("reveal") || el.classList.contains("reveal-left") || el.classList.contains("reveal-right")) {
      observer.observe(el)
    }

    return () => observer.disconnect()
  }, [])

  return ref
}
