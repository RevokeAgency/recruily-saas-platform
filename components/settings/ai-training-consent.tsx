"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Sparkles, ShieldCheck, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { MAX_WEIGHT_SHIFT, MIN_DECISIONS } from "@/lib/matching/calibration"
import { CONSENT_VERSION, LEARNING_PLANS, hasLearningConsent } from "@/lib/training/consent"

/**
 * Opt-in: Revetly lernt aus den eigenen Einstellungsentscheidungen, nur für
 * dieses Konto. Bewusst standardmäßig AUS und jederzeit widerrufbar; ein
 * Widerruf löscht die angepassten Gewichte (DB-Trigger aus 029).
 *
 * Die Fassung (CONSENT_VERSION) liegt in lib/training/consent.ts. Eine
 * Zustimmung zu einer älteren Fassung gilt nicht weiter: 2026-08-v1 betraf
 * ein gemeinsames Modell, also einen anderen Zweck.
 */
export function AiTrainingConsent() {
  const [enabled, setEnabled] = useState(false)
  const [outdated, setOutdated] = useState(false)
  const [plan, setPlan] = useState<string | null>(null)
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
          .select("ai_training_consent, ai_training_consent_version, plan")
          .eq("id", user.id)
          .single()
        if (error) { setUnavailable(true); return }
        setEnabled(hasLearningConsent(data))
        setOutdated(data?.ai_training_consent === true && !hasLearningConsent(data))
        setPlan((data?.plan as string | null) ?? null)
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
      setOutdated(false)
      toast.success(next ? "Revetly lernt jetzt aus deinen Entscheidungen" : "Einwilligung widerrufen", {
        description: next
          ? "Nur für dein Konto und jederzeit widerrufbar."
          : "Die angepassten Gewichte deines Kontos wurden gelöscht.",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading || unavailable) return null

  const weightsInPlan = LEARNING_PLANS.includes(plan ?? "")

  return (
    <Card className="reveal border border-border shadow-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(34,193,238,.12)]">
            <Sparkles className="h-[17px] w-[17px] text-[var(--rv-cyan-deep)]" strokeWidth={2} />
          </span>
          <CardTitle className="text-lg">Aus deinen Entscheidungen lernen</CardTitle>
        </div>
        <CardDescription>
          Revetly passt sich an, wie du einstellst. Nur für dein Konto, nur mit deiner Zustimmung.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="ai-training" className="text-base font-medium">
              Revetly aus meinen Entscheidungen lernen lassen
            </Label>
            <p className="text-sm text-muted-foreground">
              Wenn aktiv, wertet Revetly aus, wen du eingeladen, eingestellt oder abgesagt hast und
              wie die Gespräche liefen, und passt die Gewichtung der neun Ebenen für dein Konto an.
              Die Anpassung beginnt ab {MIN_DECISIONS} Entscheidungen und ist auf höchstens{" "}
              {Math.round(MAX_WEIGHT_SHIFT * 100)} Prozentpunkte je Ebene begrenzt. Sie gilt{" "}
              <strong>nur für dein Konto</strong>: Es wird kein gemeinsames Modell trainiert, und
              andere Kunden profitieren nicht von deinen Daten.
            </p>
            {!weightsInPlan && (
              <p className="pt-1 text-xs text-muted-foreground">
                Die angepasste Gewichtung ist Teil des Pro-Plans. In deinem Plan bleibt die
                Gewichtung beim Standard.
              </p>
            )}
            {outdated && (
              <p className="pt-1 text-xs text-amber-700">
                Deine frühere Zustimmung betraf ein gemeinsames Modell und gilt nicht mehr. Bitte
                stimme neu zu, wenn Revetly aus deinen Entscheidungen lernen soll.
              </p>
            )}
          </div>
          <Switch id="ai-training" checked={enabled} onCheckedChange={toggle} disabled={saving} />
        </div>

        <div className="flex items-start gap-2 rounded-2xl border border-[var(--app-line)] bg-[var(--muted)]/40 px-4 py-3">
          {saving
            ? <Loader2 className="mt-0.5 h-4 w-4 flex-none animate-spin text-muted-foreground" />
            : <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-[var(--rv-green-deep)]" />}
          <p className="text-xs leading-relaxed text-muted-foreground">
            Freiwillig und jederzeit widerrufbar. Ein Widerruf löscht die angepassten Gewichte deines
            Kontos. Die Verarbeitung findet ausschließlich in der EU statt. Details in der{" "}
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
