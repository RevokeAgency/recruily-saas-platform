"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Check, Zap, Crown, Sparkles, Building } from "lucide-react"
import { cn } from "@/lib/utils"
import { useProfile } from "@/lib/hooks/useProfile"
import { PLANS, type PlanId } from "@/lib/plans"

const planIcons: Record<PlanId, React.ElementType> = {
  free: Zap,
  starter: Sparkles,
  growth: Crown,
  pro: Building,
}

const planDescriptions: Record<PlanId, string> = {
  free: 'Perfekt zum Ausprobieren',
  starter: 'Für kleine Teams',
  growth: 'Für wachsende Unternehmen',
  pro: 'Für Enterprise',
}

export default function SubscriptionPage() {
  const [isAnnual, setIsAnnual] = useState(false)
  const { profile, loading } = useProfile()

  const currentPlanId = profile?.plan || 'free'
  const matchesUsed = profile?.matches_used || 0
  const matchesLimit = profile?.matches_limit || 10
  const matchPercentage = (matchesUsed / matchesLimit) * 100

  // Format renewal date
  const renewalDate = profile?.billing_period_end 
    ? new Date(profile.billing_period_end).toLocaleDateString('de-DE', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : null

  const planOrder: PlanId[] = ['free', 'starter', 'growth', 'pro']

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Abonnement</h1>
        <p className="text-muted-foreground mt-1">
          Verwalte dein Abo und deine Nutzung
        </p>
      </div>

      {/* Current Plan Usage */}
      <Card className="border border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                Aktueller Plan: {PLANS[currentPlanId].label}
              </CardTitle>
              <CardDescription>
                {renewalDate && currentPlanId !== 'free' 
                  ? `Verlängert sich am ${renewalDate}`
                  : currentPlanId === 'free' 
                  ? 'Kostenloser Plan - kein Ablaufdatum'
                  : 'Plan aktiv'}
              </CardDescription>
            </div>
            <Badge className="bg-[var(--rv-green)] text-white">Aktiv</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Matches Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Matches verwendet</span>
                <span className="font-medium text-foreground">
                  {loading ? '...' : `${matchesUsed} / ${matchesLimit}`}
                </span>
              </div>
              <Progress value={matchPercentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {loading ? 'Lädt...' : `Noch ${matchesLimit - matchesUsed} Matches verfügbar`}
              </p>
            </div>

            {/* Active Jobs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Aktive Jobs Limit</span>
                <span className="font-medium text-foreground">
                  {loading ? '...' : profile?.active_jobs_limit === 999 
                    ? 'Unbegrenzt' 
                    : `${profile?.active_jobs_limit || 1} Jobs`}
                </span>
              </div>
              <Progress
                value={profile?.active_jobs_limit === 999 ? 5 : 50}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground">
                {PLANS[currentPlanId].active_jobs === 999 
                  ? 'Unbegrenzte aktive Stellenanzeigen'
                  : `Bis zu ${PLANS[currentPlanId].active_jobs} aktive Stellenanzeigen`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-3">
        <Label
          htmlFor="billing-toggle"
          className={cn(
            "text-sm cursor-pointer",
            !isAnnual ? "text-foreground font-medium" : "text-muted-foreground"
          )}
        >
          Monatlich
        </Label>
        <Switch
          id="billing-toggle"
          checked={isAnnual}
          onCheckedChange={setIsAnnual}
        />
        <Label
          htmlFor="billing-toggle"
          className={cn(
            "text-sm cursor-pointer flex items-center gap-2",
            isAnnual ? "text-foreground font-medium" : "text-muted-foreground"
          )}
        >
          Jährlich
          <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
            2 Mo. gratis
          </Badge>
        </Label>
      </div>

      {/* Pricing Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {planOrder.map((planId) => {
          const plan = PLANS[planId]
          const price = isAnnual 
            ? Math.round(plan.price_yearly / 12) 
            : plan.price_monthly
          const isCurrent = planId === currentPlanId
          const Icon = planIcons[planId]

          return (
            <Card
              key={planId}
              className={cn(
                "relative border transition-shadow hover:shadow-md",
                plan.featured
                  ? "border-[var(--rv-green)] shadow-sm"
                  : isCurrent
                  ? "border-[rgba(22,199,124,.5)]"
                  : "border-border"
              )}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-[var(--rv-green)] text-white">
                    Beliebteste Wahl
                  </Badge>
                </div>
              )}
              
              {isCurrent && !plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="outline" className="border-[var(--rv-green)] text-[var(--rv-green)] bg-white">
                    Dein aktueller Plan
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-2">
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl mx-auto flex items-center justify-center mb-2",
                    plan.featured ? "bg-[rgba(22,199,124,.1)]" : "bg-muted"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-6 w-6",
                      plan.featured ? "text-[var(--rv-green)]" : "text-muted-foreground"
                    )}
                  />
                </div>
                <CardTitle className="text-lg">{plan.label}</CardTitle>
                <CardDescription className="text-xs">
                  {planDescriptions[planId]}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Price */}
                <div className="text-center">
                  <span className="text-3xl font-bold text-foreground">
                    {price === 0 ? "€0" : `€${price}`}
                  </span>
                  {price > 0 && (
                    <span className="text-muted-foreground text-sm">/Monat</span>
                  )}
                  {isAnnual && price > 0 && (
                    <p className="text-xs text-green-600 mt-1">
                      €{plan.price_yearly}/Jahr — 2 Mo. gratis
                    </p>
                  )}
                </div>

                {/* Match info */}
                <div className="text-center">
                  <p className="text-sm font-semibold text-[var(--rv-green)]">
                    {plan.matches_label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {plan.active_jobs === 999 
                      ? 'Unbegrenzte Jobs' 
                      : `${plan.active_jobs} aktive Jobs`}
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-2">
                  {plan.features.slice(2, 7).map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-[var(--rv-green)] flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  className={cn(
                    "w-full",
                    isCurrent 
                      ? "border-[var(--rv-green)] text-[var(--rv-green)]" 
                      : plan.featured 
                      ? "bg-[var(--rv-green)] hover:bg-[var(--rv-green-deep)] text-white"
                      : ""
                  )}
                  variant={isCurrent ? "outline" : plan.featured ? "default" : "outline"}
                  disabled={isCurrent}
                >
                  {isCurrent ? "Aktueller Plan" : "Auswählen"}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Payment Info */}
      <div className="text-center text-sm text-muted-foreground">
        <p>
          Sichere Zahlung via{" "}
          <span className="font-medium text-foreground">Stripe</span>
        </p>
        <p className="mt-1">
          Alle Preise verstehen sich zzgl. MwSt. Jederzeit kündbar.
        </p>
      </div>
    </div>
  )
}
