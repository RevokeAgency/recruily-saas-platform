"use client"

import { useState } from "react"
import { Loader2, MessageSquareHeart, Star } from "lucide-react"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

const RATING_LABELS: Record<number, string> = {
  1: "Gar nicht",
  2: "Geht so",
  3: "In Ordnung",
  4: "Gut",
  5: "Sehr gut",
}

export interface FeedbackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Woher die Abfrage kommt. Steuert Text und ob die Schwelle als erledigt gilt. */
  source: "prompt" | "settings"
  /** Anzahl bewerteter Kandidaten, nur für die Ansprache im Dialog. */
  milestone?: number
  /** Wird nach Absenden oder Wegklicken aufgerufen. */
  onResolved?: () => void
}

/**
 * Kurze Produktumfrage. Bewusst drei offene Fragen statt eines Fragebogens:
 * Wer nach fünf Matches unterbrochen wird, füllt kein Formular aus. Alle Felder
 * sind optional, abgeschickt werden kann ab einer einzigen Angabe.
 */
export function FeedbackDialog({
  open,
  onOpenChange,
  source,
  milestone,
  onResolved,
}: FeedbackDialogProps) {
  const [rating, setRating] = useState<number | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const [whatWorks, setWhatWorks] = useState("")
  const [whatToImprove, setWhatToImprove] = useState("")
  const [featureWish, setFeatureWish] = useState("")
  const [busy, setBusy] = useState<"submit" | "later" | "never" | null>(null)

  const post = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || "Das hat nicht geklappt.")
    }
  }

  const submit = async () => {
    if (rating === null && !whatWorks.trim() && !whatToImprove.trim() && !featureWish.trim()) {
      toast.error("Bitte gib eine Bewertung oder einen kurzen Hinweis ab.")
      return
    }
    setBusy("submit")
    try {
      await post({ action: "submit", rating, whatWorks, whatToImprove, featureWish, source })
      toast.success("Danke. Das liest jemand.")
      onOpenChange(false)
      onResolved?.()
      setRating(null)
      setWhatWorks("")
      setWhatToImprove("")
      setFeatureWish("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Das hat nicht geklappt.")
    } finally {
      setBusy(null)
    }
  }

  const dismiss = async (action: "later" | "never") => {
    setBusy(action)
    try {
      await post({ action })
      onOpenChange(false)
      onResolved?.()
    } catch {
      onOpenChange(false)
    } finally {
      setBusy(null)
    }
  }

  const activeRating = hovered ?? rating

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Wegklicken über X oder Escape zählt wie „Später": Beim nächsten Mal
        // wird gefragt, aber nicht sofort wieder.
        if (!next && source === "prompt" && busy === null) void dismiss("later")
        else onOpenChange(next)
      }}
    >
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-[540px]">
        <div className="border-b border-[var(--app-line)] bg-[var(--app-green-wash)] px-6 py-5">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--rv-green)]">
              <MessageSquareHeart className="h-4.5 w-4.5 text-[#0C1A16]" strokeWidth={2.2} />
            </div>
            <DialogTitle className="text-lg font-bold tracking-tight">
              {source === "settings"
                ? "Was sollen wir besser machen?"
                : "Kurz gefragt: Wie läuft es mit Revetly?"}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              {source === "settings"
                ? "Schreib uns, was dir fehlt. Wir lesen jede Rückmeldung."
                : `Du hast gerade ${milestone ?? 5} Kandidaten bewertet. Zwei Minuten deiner Zeit sagen uns mehr als jede Statistik.`}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div>
            <Label className="text-sm font-semibold">Wie zufrieden bist du bisher?</Label>
            <div className="mt-2.5 flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={`${value} von 5`}
                  onClick={() => setRating(value)}
                  onMouseEnter={() => setHovered(value)}
                  onMouseLeave={() => setHovered(null)}
                  className="rounded-lg p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-7 w-7 transition-colors ${
                      activeRating !== null && value <= activeRating
                        ? "fill-[var(--rv-green)] text-[var(--rv-green)]"
                        : "text-muted-foreground/35"
                    }`}
                    strokeWidth={1.8}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-muted-foreground">
                {activeRating !== null ? RATING_LABELS[activeRating] : ""}
              </span>
            </div>
          </div>

          <div>
            <Label htmlFor="fb-works" className="text-sm font-semibold">
              Was funktioniert gut?
            </Label>
            <Textarea
              id="fb-works"
              value={whatWorks}
              onChange={(e) => setWhatWorks(e.target.value)}
              placeholder="Zum Beispiel: Die Begründung zum Score spart mir das Querlesen."
              rows={2}
              className="mt-2 resize-none"
            />
          </div>

          <div>
            <Label htmlFor="fb-improve" className="text-sm font-semibold">
              Was sollten wir besser machen?
            </Label>
            <Textarea
              id="fb-improve"
              value={whatToImprove}
              onChange={(e) => setWhatToImprove(e.target.value)}
              placeholder="Was hat dich zuletzt aufgehalten oder geärgert?"
              rows={2}
              className="mt-2 resize-none"
            />
          </div>

          <div>
            <Label htmlFor="fb-wish" className="text-sm font-semibold">
              Welches Feature wünschst du dir?
            </Label>
            <Textarea
              id="fb-wish"
              value={featureWish}
              onChange={(e) => setFeatureWish(e.target.value)}
              placeholder="Was müsste Revetly können, damit du es nicht mehr hergibst?"
              rows={2}
              className="mt-2 resize-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--app-line)] px-6 py-4">
          {source === "prompt" ? (
            <button
              type="button"
              onClick={() => dismiss("never")}
              disabled={busy !== null}
              className="text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline disabled:opacity-50"
            >
              Nicht mehr fragen
            </button>
          ) : (
            <span className="text-xs text-muted-foreground">Alle Felder sind freiwillig.</span>
          )}

          <div className="ml-auto flex items-center gap-2">
            {source === "prompt" && (
              <Button
                variant="ghost"
                onClick={() => dismiss("later")}
                disabled={busy !== null}
              >
                {busy === "later" && <Loader2 className="h-4 w-4 animate-spin" />}
                Später
              </Button>
            )}
            <Button onClick={submit} disabled={busy !== null}>
              {busy === "submit" && <Loader2 className="h-4 w-4 animate-spin" />}
              Feedback senden
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
