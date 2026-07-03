"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Link2, Mail, Copy, ExternalLink, Check } from "lucide-react"
import { useProfile } from "@/lib/hooks/useProfile"
import { buildJobEmailAddress, slugify } from "@/lib/email/routing"

interface JobChannelsModalProps {
  isOpen: boolean
  onClose: () => void
  jobId: string
  jobTitle?: string
  jobSlug?: string
}

export function JobChannelsModal({ isOpen, onClose, jobId, jobTitle, jobSlug }: JobChannelsModalProps) {
  const { profile } = useProfile()
  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const jobPageUrl = profile?.slug
    ? `${origin}/jobs/${profile.slug}/${jobSlug || slugify(jobTitle || "job")}`
    : null
  const emailAddress = profile?.slug
    ? buildJobEmailAddress(profile.slug, jobTitle || "job", jobId)
    : null

  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const el = document.createElement("textarea")
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand("copy")
      document.body.removeChild(el)
    }
    setCopiedKey(key)
    setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2000)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Dein Job ist bereit!</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            So können Bewerbungen reinkommen:
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Section 1 — Apply Link */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[var(--app-green-wash)] flex items-center justify-center">
                <Link2 className="h-4 w-4 text-[var(--rv-green-deep)]" />
              </div>
              <span className="font-medium text-sm">Öffentliche Job-Page</span>
            </div>

            <div className="bg-muted/50 rounded-lg px-3 py-2.5">
              <p className="text-xs text-muted-foreground font-mono break-all">{jobPageUrl ?? "…"}</p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" disabled={!jobPageUrl} onClick={() => jobPageUrl && copy(jobPageUrl, "link")}>
                {copiedKey === "link" ? (
                  <><Check className="mr-2 h-4 w-4 text-[var(--rv-green-deep)]" /> Kopiert!</>
                ) : (
                  <><Copy className="mr-2 h-4 w-4" /> Link kopieren</>
                )}
              </Button>
              <Button variant="outline" size="sm" className="flex-1" disabled={!jobPageUrl} onClick={() => jobPageUrl && window.open(jobPageUrl, "_blank")}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Öffnen
              </Button>
            </div>
          </div>

          {/* Section 2 — Bewerbungs-Email (auto-inbound) */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[var(--app-green-wash)] flex items-center justify-center">
                <Mail className="h-4 w-4 text-[var(--rv-green-deep)]" />
              </div>
              <span className="font-medium text-sm">Bewerbungs-Email</span>
            </div>

            <div className="bg-muted/50 rounded-lg px-3 py-2.5">
              <p className="text-xs text-muted-foreground font-mono break-all">
                {emailAddress ?? "…"}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                disabled={!emailAddress}
                onClick={() => emailAddress && copy(emailAddress, "email")}
              >
                {copiedKey === "email" ? (
                  <><Check className="mr-2 h-4 w-4 text-[var(--rv-green-deep)]" /> Kopiert!</>
                ) : (
                  <><Copy className="mr-2 h-4 w-4" /> Adresse kopieren</>
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Bewerbungen an diese Adresse werden automatisch geparst, gescort und
              landen direkt in diesem Job — EU-gehostet, DSGVO-konform.
            </p>
          </div>

          {/* Footer hint */}
          <p className="text-xs text-muted-foreground text-center leading-relaxed px-2">
            Füge Link oder Email in deine Stellenausschreibung auf Karriere.at,
            LinkedIn oder deiner Website ein — Bewerbungen landen automatisch in Revetly.
          </p>
        </div>

        <Button onClick={onClose} className="w-full">
          Fertig
        </Button>
      </DialogContent>
    </Dialog>
  )
}
