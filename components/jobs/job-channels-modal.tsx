"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Link2, Mail, Copy, ExternalLink, Check } from "lucide-react"

interface JobChannelsModalProps {
  isOpen: boolean
  onClose: () => void
  jobId: string
}

const BASE_URL = "https://v0-recruily-saas-platform.vercel.app"

export function JobChannelsModal({ isOpen, onClose, jobId }: JobChannelsModalProps) {
  const applyUrl = `${BASE_URL}/apply/${jobId}`
  const emailAlias = `jobs+${jobId.slice(0, 8)}@revetly.ai`

  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(applyUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for environments without clipboard API
      const el = document.createElement("textarea")
      el.value = applyUrl
      document.body.appendChild(el)
      el.select()
      document.execCommand("copy")
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Ihr Job ist bereit!
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            So können Bewerbungen reinkommen:
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Section 1 — Apply Link */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                <Link2 className="h-4 w-4 text-teal-600" />
              </div>
              <span className="font-medium text-sm">Bewerbungs-Link</span>
            </div>

            <div className="bg-muted/50 rounded-lg px-3 py-2.5">
              <p className="text-xs text-muted-foreground font-mono break-all">{applyUrl}</p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleCopy}
              >
                {copied ? (
                  <><Check className="mr-2 h-4 w-4 text-teal-600" /> Kopiert!</>
                ) : (
                  <><Copy className="mr-2 h-4 w-4" /> Link kopieren</>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => window.open(applyUrl, "_blank")}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Link öffnen
              </Button>
            </div>
          </div>

          {/* Section 2 — Email (Coming Soon) */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3 opacity-70">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Mail className="h-4 w-4 text-slate-500" />
                </div>
                <span className="font-medium text-sm">Bewerbungs-Email</span>
              </div>
              <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
            </div>

            <div className="bg-muted/50 rounded-lg px-3 py-2.5">
              <p className="text-xs text-muted-foreground font-mono">{emailAlias}</p>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Bald verfügbar — CVs per Email werden automatisch verarbeitet.
            </p>
          </div>

          {/* Footer hint */}
          <p className="text-xs text-muted-foreground text-center leading-relaxed px-2">
            Füge den Link in deine Stellenausschreibung auf Karriere.at, LinkedIn oder deiner Website ein — Bewerbungen landen automatisch in REVETLY.
          </p>
        </div>

        <Button onClick={onClose} className="w-full bg-teal-600 hover:bg-teal-700">
          Fertig
        </Button>
      </DialogContent>
    </Dialog>
  )
}
