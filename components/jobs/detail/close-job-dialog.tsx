"use client"

import { useEffect, useState } from "react"
import { mutate as globalMutate } from "swr"
import { Loader2, Lock } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type Preview = { open: number; withEmail: number; hired: number; canEmail: boolean }

/**
 * Stelle abschließen: schließt die Stelle, sagt allen noch offenen Bewerbern
 * ab und verschickt auf Wunsch die Absage-Mails. Ersetzt das bloße
 * "Job schließen", das die Bewerber ohne Antwort zurückließ.
 */
export function CloseJobDialog({
  jobId,
  open,
  onOpenChange,
  onClosed,
}: {
  jobId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onClosed: () => void
}) {
  const [preview, setPreview] = useState<Preview | null>(null)
  const [notify, setNotify] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setPreview(null)
    setNotify(true)
    fetch(`/api/jobs/${jobId}/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preview: true }),
    })
      .then((r) => r.json())
      .then((d) => setPreview(d as Preview))
      .catch(() => setPreview({ open: 0, withEmail: 0, hired: 0, canEmail: false }))
  }, [open, jobId])

  const canNotify = !!preview && preview.canEmail && preview.withEmail > 0
  const withoutEmail = preview ? preview.open - preview.withEmail : 0

  const confirm = async () => {
    setBusy(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notify: canNotify && notify }),
      })
      const d = await res.json()
      if (!res.ok) {
        toast.error(d.error || "Stelle konnte nicht abgeschlossen werden")
        return
      }
      const parts = [`${d.rejected} Bewerber abgesagt`]
      if (d.emailed > 0) parts.push(`${d.emailed} Absagen verschickt`)
      if (d.failed > 0) parts.push(`${d.failed} Mails nicht zugestellt`)
      toast.success("Stelle abgeschlossen", { description: parts.join(", ") })
      globalMutate(`/api/jobs/${jobId}/candidates`)
      onOpenChange(false)
      onClosed()
    } catch {
      toast.error("Stelle konnte nicht abgeschlossen werden")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Stelle abschließen</DialogTitle>
          <DialogDescription>
            Die Stelle nimmt danach keine neuen Bewerbungen mehr an. Alle noch offenen Bewerber
            werden auf „Abgesagt" gesetzt. Eingestellte und bereits abgesagte bleiben unverändert.
          </DialogDescription>
        </DialogHeader>

        {!preview ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Bewerber werden gezählt …
          </div>
        ) : (
          <div className="space-y-3 py-1">
            <p className="text-sm text-foreground">
              <strong className="tabular-nums">{preview.open}</strong>{" "}
              {preview.open === 1 ? "offener Bewerber" : "offene Bewerber"}
            </p>

            {preview.hired === 0 && preview.open > 0 && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Noch niemand ist als eingestellt markiert. Wenn du jemanden einstellst, markiere
                ihn vorher, sonst bekommt er ebenfalls eine Absage.
              </p>
            )}

            {preview.open > 0 && (
              <label className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${canNotify ? "cursor-pointer" : "bg-[var(--muted)]/60"}`}>
                <Checkbox
                  checked={canNotify && notify}
                  disabled={!canNotify}
                  onCheckedChange={(v) => setNotify(v === true)}
                  className="mt-0.5"
                />
                <span className="text-sm">
                  <span className="font-medium text-foreground">
                    {canNotify
                      ? `${preview.withEmail} ${preview.withEmail === 1 ? "Bewerber" : "Bewerbern"} eine Absage per E-Mail senden`
                      : "Absage per E-Mail nicht möglich"}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {!preview.canEmail
                      ? "Der E-Mail-Versand ist nicht eingerichtet."
                      : withoutEmail > 0
                        ? `${withoutEmail} ohne E-Mail-Adresse ${withoutEmail === 1 ? "wird" : "werden"} nur abgesagt.`
                        : "Persönlich formuliert, mit Name und Stelle."}
                  </span>
                </span>
              </label>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Abbrechen
          </Button>
          <Button onClick={confirm} disabled={busy || !preview}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
            Stelle abschließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
