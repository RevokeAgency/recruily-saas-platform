"use client"

import { useEffect } from "react"

/**
 * Fires the queued-application re-score once when the dashboard mounts. This is
 * the lazy trigger for "auto re-score after the monthly reset or an upgrade":
 * the endpoint is a no-op when nothing is queued or no quota is left. A Stripe
 * webhook should also hit /api/matches/backfill on upgrade (later phase).
 */
export function MatchBackfillTrigger() {
  useEffect(() => {
    const ctrl = new AbortController()
    fetch("/api/matches/backfill", { method: "POST", signal: ctrl.signal }).catch(() => {})
    return () => ctrl.abort()
  }, [])
  return null
}
