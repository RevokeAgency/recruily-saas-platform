"use client"

import { useMemo, useState } from "react"
import { Check, Copy, Link2Off, Loader2, Mail, MessageCircle, ShieldAlert, ThumbsDown, ThumbsUp } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { REVIEW_MAX_CANDIDATES, REVIEW_NOTE_MAX, REVIEW_VALID_DAYS } from "@/lib/review/shared"

export interface ReviewLinkSummary {
  id: string
  reviewerName: string | null
  reviewerEmail: string | null
  createdAt: string
  expiresAt: string
  openedAt: string | null
  state: "aktiv" | "abgelaufen" | "widerrufen" | "abgeschlossen"
  counts: { interessant: number; ablehnen: number; offen: number }
  items: Array<{ jobCandidateId: string; verdict: string | null; comment: string | null; decidedAt: string | null }>
}

export interface ReviewCandidateOption {
  linkId: string
  full_name: string
  job_title: string | null
  match_score: number | null
  knockout: boolean
  status: string
}

const STATE_LABEL: Record<ReviewLinkSummary["state"], { label: string; className: string }> = {
  aktiv: { label: "Offen", className: "bg-[rgba(34,193,238,.12)] text-[var(--rv-cyan-deep)]" },
  abgeschlossen: { label: "Beantwortet", className: "bg-[var(--app-green-wash)] text-[var(--rv-green-deep)]" },
  abgelaufen: { label: "Abgelaufen", className: "bg-[var(--muted)] text-muted-foreground" },
  widerrufen: { label: "Zurückgezogen", className: "bg-[var(--muted)] text-muted-foreground" },
}

function dateDe(iso: string) {
  return new Date(iso).toLocaleDateString("de-AT", { day: "numeric", month: "short" })
}

/**
 * Freigabe-Link anlegen: Bewerber auswählen, Empfänger eintragen, Link per
 * Mail schicken oder kopieren und selbst teilen (etwa über WhatsApp).
 * Darunter die bisherigen Links der Stelle mit Stand und Widerrufen.
 */
export function ReviewLinkDialog({
  open,
  onOpenChange,
  jobId,
  jobTitle,
  candidates,
  links,
  onChanged,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  jobTitle: string
  candidates: ReviewCandidateOption[]
  links: ReviewLinkSummary[]
  onChanged: () => void
}) {
  // Wer schon abgesagt ist, kommt nicht in Frage. Beste zuerst.
  const options = useMemo(
    () =>
      candidates
        .filter((c) => c.status !== "Abgesagt")
        .sort((a, b) => (b.match_score ?? -1) - (a.match_score ?? -1)),
    [candidates],
  )

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<{ url: string; mailed: boolean; email: string | null } | null>(null)
  const [copied, setCopied] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)

  // Beim Öffnen frisch beginnen, die fünf stärksten ohne K.O. vorauswählen.
  // Während des Renderns statt im Effekt, so wie React es für abgeleiteten
  // Zustand empfiehlt: kein zusätzlicher Durchlauf mit veraltetem Inhalt.
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setCreated(null)
      setCopied(false)
      setSelected(new Set(options.filter((c) => c.match_score != null && !c.knockout).slice(0, 5).map((c) => c.linkId)))
    }
  }

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < REVIEW_MAX_CANDIDATES) next.add(id)
      else toast.error(`Höchstens ${REVIEW_MAX_CANDIDATES} Bewerber pro Link.`)
      return next
    })
  }

  const create = async () => {
    setBusy(true)
    try {
      const res = await fetch("/api/review-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          // Reihenfolge wie in der Liste, damit der Fachbereich die Stärksten zuerst sieht.
          jobCandidateIds: options.filter((c) => selected.has(c.linkId)).map((c) => c.linkId),
          reviewerName: name,
          reviewerEmail: email,
          note,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Link konnte nicht erstellt werden")
        return
      }
      setCreated({ url: data.url, mailed: data.mailed === true, email: email.trim() || null })
      if (email.trim() && !data.mailed) toast.warning("Link erstellt, aber die E-Mail wurde nicht gesendet. Teile den Link selbst.")
      onChanged()
    } catch {
      toast.error("Link konnte nicht erstellt werden")
    } finally {
      setBusy(false)
    }
  }

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      toast.error("Kopieren nicht möglich. Markiere den Link und kopiere ihn selbst.")
    }
  }

  const whatsapp = (url: string) => {
    const text = `${name.trim() ? `Hallo ${name.trim()}, ` : ""}kannst du dir diese Bewerbungen für ${jobTitle} ansehen? Ein Klick pro Person genügt: ${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer")
  }

  const revoke = async (id: string) => {
    setRevoking(id)
    try {
      const res = await fetch(`/api/review-links/${id}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "Zurückziehen fehlgeschlagen")
        return
      }
      toast.success("Link zurückgezogen")
      onChanged()
    } finally {
      setRevoking(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Fachbereich fragen</DialogTitle>
          <DialogDescription>
            Ein Link, über den eine Person aus deinem Unternehmen die Bewerbungen ohne Login ansieht und pro
            Bewerber „Interessant“ oder „Ablehnen“ sagt. Status und Absagen bleiben bei dir.
          </DialogDescription>
        </DialogHeader>

        {created ? (
          <div className="space-y-4 py-1">
            <div className="flex items-start gap-3 rounded-2xl bg-[var(--app-green-wash)] px-4 py-3 text-sm">
              <Check className="mt-0.5 h-4 w-4 flex-none text-[var(--rv-green-deep)]" strokeWidth={2.6} />
              <span className="text-foreground">
                {created.mailed
                  ? `Link per E-Mail an ${created.email} geschickt.`
                  : "Link erstellt. Teile ihn jetzt mit der Person aus dem Fachbereich."}{" "}
                Er gilt {REVIEW_VALID_DAYS} Tage.
              </span>
            </div>
            <div className="flex gap-2">
              <Input readOnly value={created.url} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
              <Button variant="outline" onClick={() => copy(created.url)} className="flex-none">
                {copied ? <Check className="h-4 w-4 text-[var(--rv-green-deep)]" /> : <Copy className="h-4 w-4" />}
                <span className="sr-only">Kopieren</span>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => whatsapp(created.url)}>
                <MessageCircle className="mr-2 h-4 w-4" /> Per WhatsApp teilen
              </Button>
              <Button onClick={() => onOpenChange(false)}>Fertig</Button>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Den Link siehst du nur jetzt. Gespeichert wird er nicht im Klartext. Brauchst du ihn später noch einmal,
              erstell einfach einen neuen.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-1">
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-sm font-medium text-foreground">Bewerber</span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {selected.size} von höchstens {REVIEW_MAX_CANDIDATES}
                </span>
              </div>
              {options.length === 0 ? (
                <p className="rounded-xl bg-[var(--muted)]/60 px-3 py-3 text-sm text-muted-foreground">
                  Für diese Stelle gibt es noch keine offenen Bewerbungen.
                </p>
              ) : (
                <ul className="max-h-60 space-y-1 overflow-y-auto rounded-xl border border-black/[0.06] p-1.5">
                  {options.map((c) => (
                    <li key={c.linkId}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-[var(--muted)]/60">
                        <Checkbox checked={selected.has(c.linkId)} onCheckedChange={() => toggle(c.linkId)} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                            {c.full_name}
                            {c.knockout && <ShieldAlert className="h-3.5 w-3.5 flex-none text-red-500" aria-label="K.O.-Kriterium" />}
                          </span>
                          {c.job_title && <span className="block truncate text-xs text-muted-foreground">{c.job_title}</span>}
                        </span>
                        <span className="flex-none text-sm font-semibold tabular-nums text-foreground">
                          {c.match_score != null ? c.match_score : "–"}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="review-name" className="text-sm font-medium text-foreground">Name</label>
                <Input id="review-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Thomas" maxLength={120} className="mt-1.5" />
              </div>
              <div>
                <label htmlFor="review-email" className="text-sm font-medium text-foreground">
                  E-Mail <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <Input id="review-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="thomas@firma.at" className="mt-1.5" />
              </div>
            </div>
            <div>
              <label htmlFor="review-note" className="text-sm font-medium text-foreground">
                Nachricht <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                id="review-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={REVIEW_NOTE_MAX}
                rows={2}
                placeholder="Kannst du bis Freitag drüberschauen?"
                className="mt-1.5 resize-none"
              />
            </div>

            <Button onClick={create} disabled={busy || selected.size === 0} className="w-full rounded-full">
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : email.trim() ? <Mail className="mr-2 h-4 w-4" /> : null}
              {email.trim() ? "Link erstellen und per E-Mail senden" : "Link erstellen"}
            </Button>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Die Person sieht Zusammenfassung, Match und Lebenslauf, aber keine Kontaktdaten. Der Link gilt{" "}
              {REVIEW_VALID_DAYS} Tage und lässt sich jederzeit zurückziehen.
            </p>
          </div>
        )}

        {links.length > 0 && (
          <div className="border-t border-black/[0.06] pt-4">
            <p className="mb-2 text-sm font-medium text-foreground">Bisherige Links</p>
            <ul className="space-y-2">
              {links.map((l) => (
                <li key={l.id} className="flex items-center gap-3 rounded-xl border border-black/[0.05] px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-sm font-medium text-foreground">
                      {l.reviewerName || l.reviewerEmail || "Ohne Namen"}
                      <span className={`flex-none rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATE_LABEL[l.state].className}`}>
                        {STATE_LABEL[l.state].label}
                      </span>
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 text-xs text-muted-foreground">
                      <span>{dateDe(l.createdAt)}</span>
                      <span className="inline-flex items-center gap-1 text-[var(--rv-green-deep)]"><ThumbsUp className="h-3 w-3" />{l.counts.interessant}</span>
                      <span className="inline-flex items-center gap-1 text-red-600"><ThumbsDown className="h-3 w-3" />{l.counts.ablehnen}</span>
                      {l.counts.offen > 0 && <span>{l.counts.offen} offen</span>}
                      {!l.openedAt && l.state === "aktiv" && <span>noch nicht geöffnet</span>}
                    </p>
                  </div>
                  {l.state === "aktiv" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => revoke(l.id)}
                      disabled={revoking === l.id}
                      className="flex-none text-muted-foreground"
                      title="Link sofort ungültig machen"
                    >
                      {revoking === l.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2Off className="h-4 w-4" />}
                      <span className="sr-only">Zurückziehen</span>
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
