"use client"

import { useState } from "react"
import { MessageSquareHeart } from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FeedbackDialog } from "@/components/feedback/feedback-dialog"

/**
 * Feedback jederzeit abgeben, unabhängig von der automatischen Abfrage.
 * Gleichzeitig der Weg zurück für alle, die einmal „Nicht mehr fragen"
 * geklickt haben.
 */
export function FeedbackCard() {
  const [open, setOpen] = useState(false)
  const [reactivating, setReactivating] = useState(false)

  const reactivate = async () => {
    setReactivating(true)
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      })
      if (!res.ok) throw new Error()
      toast.success("Wir melden uns wieder, wenn es etwas zu fragen gibt.")
    } catch {
      toast.error("Das hat nicht geklappt.")
    } finally {
      setReactivating(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareHeart className="h-5 w-5" />
            Feedback
          </CardTitle>
          <CardDescription>
            Revetly wird nach dem gebaut, was im Alltag fehlt. Sag uns, was das bei dir ist.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => setOpen(true)}>Feedback geben</Button>
            <Button variant="ghost" onClick={reactivate} disabled={reactivating}>
              Umfragen wieder einschalten
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Deine Rückmeldung landet beim Revetly-Team, nicht bei einem Ticketsystem.
          </p>
        </CardContent>
      </Card>

      <FeedbackDialog open={open} onOpenChange={setOpen} source="settings" />
    </>
  )
}
