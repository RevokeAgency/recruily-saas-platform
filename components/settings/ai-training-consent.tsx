"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Sparkles, ShieldCheck, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

// Fassung der Einwilligungserklärung. Ändert sich der Text inhaltlich, MUSS
// diese Kennung hochgezählt werden — nur so ist nachweisbar, wem wozu
// zugestimmt wurde (Art. 7 Abs. 1 DSGVO).
const CONSENT_VERSION = "2026-08-v1"

/**
 * Opt-in für die Verbesserung des Revetly-Matchings mit den eigenen
 * Entscheidungsdaten. Bewusst standardmäßig AUS und jederzeit widerrufbar —
 * ein Widerruf löscht die gesammelten Beispiele automatisch (DB-Trigger).
 */
export function AiTrainingConsent() {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data, error } = await supabase
          .from("user_profiles")
          .select("ai_training_consent")
          .eq("id", user.id)
          .single()
        if (error) { setUnavailable(true); return }
        setEnabled(data?.ai_training_consent === true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const toggle = async (next: boolean) => {
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error } = await supabase
        .from("user_profiles")
        .update({
          ai_training_consent: next,
          ai_training_consent_at: next ? new Date().toISOString() : null,
          ai_training_consent_version: next ? CONSENT_VERSION : null,
        })
        .eq("id", user.id)
      if (error) {
        toast.error("Einstellung konnte nicht gespeichert werden")
        return
      }
      setEnabled(next)
      toast.success(
        next ? "Danke — deine Entscheidungen verbessern jetzt das Matching" : "Einwilligung widerrufen",
        {
          description: next
            ? "Pseudonymisiert und jederzeit widerrufbar."
            : "Bereits gesammelte Trainingsdaten deines Kontos wurden gelöscht.",
        },
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading || unavailable) return null

  return (
    <Card className="reveal border border-border shadow-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(34,193,238,.12)]">
            <Sparkles className="h-[17px] w-[17px] text-[var(--rv-cyan-deep)]" strokeWidth={2} />
          </span>
          <CardTitle className="text-lg">Matching verbessern</CardTitle>
        </div>
        <CardDescription>
          Hilf mit, das Revetly-Matching für deine Branche treffsicherer zu machen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="ai-training" className="text-base font-medium">
              Eigene Entscheidungen zum Training freigeben
            </Label>
            <p className="text-sm text-muted-foreground">
              Wenn aktiv, fließen deine Interview-Bewertungen und Einstellungsentscheidungen in die
              Weiterentwicklung unseres KI-Modells ein — <strong>pseudonymisiert</strong>: Namen,
              Kontaktdaten, Adressen und Arbeitgeber werden vorher entfernt. Es werden keine
              Lebensläufe im Klartext und keine Kandidatendaten weitergegeben.
            </p>
          </div>
          <Switch id="ai-training" checked={enabled} onCheckedChange={toggle} disabled={saving} />
        </div>

        <div className="flex items-start gap-2 rounded-2xl border border-[var(--app-line)] bg-[var(--muted)]/40 px-4 py-3">
          {saving
            ? <Loader2 className="mt-0.5 h-4 w-4 flex-none animate-spin text-muted-foreground" />
            : <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-[var(--rv-green-deep)]" />}
          <p className="text-xs leading-relaxed text-muted-foreground">
            Freiwillig und jederzeit widerrufbar. Ein Widerruf löscht die bereits gesammelten
            Trainingsdaten deines Kontos automatisch. Die Verarbeitung findet ausschließlich in der
            EU statt. Details in der{" "}
            <a href="/datenschutz" className="font-medium text-[var(--rv-green-deep)] underline">
              Datenschutzerklärung
            </a>
            .
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
