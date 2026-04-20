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

const currentPlan = {
  name: "Starter",
  matchesUsed: 47,
  matchesTotal: 100,
  activeJobs: 3,
  activeJobsLimit: 5,
  renewalDate: "1. April 2024",
}

const plans = [
  {
    id: "free",
    name: "Free",
    description: "Perfekt zum Ausprobieren",
    price: { monthly: 0, annual: 0 },
    features: [
      "10 Matches pro Monat",
      "1 aktiver Job",
      "Basis-Matching",
      "E-Mail Support",
    ],
    icon: Zap,
    popular: false,
  },
  {
    id: "starter",
    name: "Starter",
    description: "Für kleine Teams",
    price: { monthly: 49, annual: 39 },
    features: [
      "100 Matches pro Monat",
      "5 aktive Jobs",
      "Vollständiges 9-Kategorien Matching",
      "E-Mail Support",
      "CV-Parsing mit AI",
    ],
    icon: Sparkles,
    popular: false,
    current: true,
  },
  {
    id: "growth",
    name: "Growth",
    description: "Für wachsende Unternehmen",
    price: { monthly: 149, annual: 119 },
    features: [
      "500 Matches pro Monat",
      "20 aktive Jobs",
      "Prioritäts-Matching",
      "AI Screening Calls (V1.5)",
      "Priority Support",
      "Erweiterte Analysen",
    ],
    icon: Crown,
    popular: true,
  },
  {
    id: "pro",
    name: "Pro",
    description: "Für Enterprise",
    price: { monthly: 299, annual: 239 },
    features: [
      "Unbegrenzte Matches",
      "Unbegrenzte Jobs",
      "Alle Features",
      "Dedicated Support",
      "Custom Integrations",
      "API Zugang",
      "SSO",
    ],
    icon: Building,
    popular: false,
  },
]

export default function SubscriptionPage() {
  const [isAnnual, setIsAnnual] = useState(false)

  const matchPercentage = (currentPlan.matchesUsed / currentPlan.matchesTotal) * 100

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Subscription</h1>
        <p className="text-muted-foreground mt-1">
          Verwalte dein Abo und deine Nutzung
        </p>
      </div>

      {/* Current Plan Usage */}
      <Card className="border border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Aktueller Plan: {currentPlan.name}</CardTitle>
              <CardDescription>
                Verlängert sich am {currentPlan.renewalDate}
              </CardDescription>
            </div>
            <Badge className="bg-primary text-primary-foreground">Aktiv</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Matches Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Matches verwendet</span>
                <span className="font-medium text-foreground">
                  {currentPlan.matchesUsed} / {currentPlan.matchesTotal}
                </span>
              </div>
              <Progress value={matchPercentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Noch {currentPlan.matchesTotal - currentPlan.matchesUsed} Matches verfügbar
              </p>
            </div>

            {/* Active Jobs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Aktive Jobs</span>
                <span className="font-medium text-foreground">
                  {currentPlan.activeJobs} / {currentPlan.activeJobsLimit}
                </span>
              </div>
              <Progress
                value={(currentPlan.activeJobs / currentPlan.activeJobsLimit) * 100}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground">
                Noch {currentPlan.activeJobsLimit - currentPlan.activeJobs} Jobs verfügbar
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
          <Badge variant="secondary" className="bg-success/10 text-success text-xs">
            -20%
          </Badge>
        </Label>
      </div>

      {/* Pricing Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const price = isAnnual ? plan.price.annual : plan.price.monthly
          const isCurrent = plan.current

          return (
            <Card
              key={plan.id}
              className={cn(
                "relative border transition-shadow hover:shadow-md",
                plan.popular
                  ? "border-primary shadow-sm"
                  : isCurrent
                  ? "border-primary/50"
                  : "border-border"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    Beliebteste Wahl
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-2">
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl mx-auto flex items-center justify-center mb-2",
                    plan.popular ? "bg-primary/10" : "bg-muted"
                  )}
                >
                  <plan.icon
                    className={cn(
                      "h-6 w-6",
                      plan.popular ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                </div>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <CardDescription className="text-xs">
                  {plan.description}
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
                    <p className="text-xs text-muted-foreground mt-1">
                      Jährlich abgerechnet
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  className="w-full"
                  variant={isCurrent ? "outline" : plan.popular ? "default" : "outline"}
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
