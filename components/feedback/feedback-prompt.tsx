"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

import { FeedbackDialog } from "./feedback-dialog"

/** Nach so vielen Millisekunden im Ruhezustand darf gefragt werden. */
const DELAY_MS = 2500

/**
 * Stößt die Produktumfrage an, sobald der Kunde eine der Schwellen erreicht
 * hat (siehe lib/feedback/prompt.ts). Hängt einmal im App-Layout.
 *
 * Zwei bewusste Einschränkungen: In laufenden Formularen (Job anlegen,
 * Onboarding) wird nicht gefragt, und der Dialog erscheint erst ein paar
 * Sekunden nach dem Seitenaufbau. Eine Umfrage, die einen Klick abfängt,
 * bekommt Wut statt Antworten.
 */
export function FeedbackPrompt() {
  const pathname = usePathname()
  const [milestone, setMilestone] = useState<number | null>(null)
  const [open, setOpen] = useState(false)
  const [checked, setChecked] = useState(false)

  const blocked =
    pathname?.startsWith("/jobs/new") ||
    pathname?.includes("/edit") ||
    pathname?.startsWith("/onboarding") ||
    pathname?.startsWith("/candidates/new")

  useEffect(() => {
    if (checked || blocked) return
    let cancelled = false

    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/feedback", { cache: "no-store" })
        if (!res.ok) return
        const data = (await res.json()) as { prompt: { milestone: number } | null }
        if (cancelled || !data.prompt) return
        setMilestone(data.prompt.milestone)
        setOpen(true)
      } catch {
        /* Eine fehlgeschlagene Umfrage bleibt folgenlos. */
      } finally {
        if (!cancelled) setChecked(true)
      }
    }, DELAY_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [checked, blocked])

  if (milestone === null) return null

  return (
    <FeedbackDialog
      open={open}
      onOpenChange={setOpen}
      source="prompt"
      milestone={milestone}
      onResolved={() => setMilestone(null)}
    />
  )
}
