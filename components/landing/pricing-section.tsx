"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"

const plans = [
  {
    name: "Starter",
    monthlyPrice: 49,
    annualPrice: 39,
    matches: "250 Matches",
    features: [
      "250 matches per month",
      "Basic candidate filtering",
      "Email support",
      "1 user account",
    ],
    popular: false,
    current: false,
  },
  {
    name: "Professional",
    monthlyPrice: 129,
    annualPrice: 103,
    matches: "1000 Matches",
    features: [
      "1000 matches per month",
      "Advanced filtering",
      "Priority email support",
      "5 user accounts",
      "Custom job templates",
      "Analytics dashboard",
    ],
    popular: true,
    current: true,
  },
  {
    name: "Scale-Up",
    monthlyPrice: 249,
    annualPrice: 199,
    matches: "3000 Matches",
    features: [
      "3000 matches per month",
      "Advanced filtering",
      "Priority phone & email support",
      "Unlimited user accounts",
      "Custom job templates",
      "Advanced analytics",
      "API access",
      "Dedicated account manager",
    ],
    popular: false,
    current: false,
  },
]

export function PricingSection() {
  const [annual, setAnnual] = useState(false)

  return (
    <section id="pricing" className="py-20 bg-slate-50 relative overflow-hidden">
      {/* Decorative circle on left */}
      <div className="absolute left-0 bottom-1/4 w-48 h-48">
        <div className="w-full h-full rounded-full bg-slate-200/60" style={{ clipPath: "inset(0 50% 0 0)" }} />
      </div>

      {/* Large decorative circle on right */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[400px] h-[400px]">
        <div className="w-full h-full rounded-full bg-slate-200/60" style={{ clipPath: "inset(0 0 0 50%)" }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Toggle */}
        <div className="flex items-center justify-center gap-4 mb-16">
          <span className={`text-sm ${!annual ? "text-slate-900 font-medium" : "text-slate-500"}`}>
            Monthly
          </span>
          <Switch
            checked={annual}
            onCheckedChange={setAnnual}
            className="data-[state=checked]:bg-[#0D9488]"
          />
          <span className={`text-sm ${annual ? "text-slate-900 font-medium" : "text-slate-500"}`}>
            Annual
          </span>
          {annual && (
            <Badge variant="secondary" className="bg-slate-200 text-slate-700 text-xs">
              Save 20%
            </Badge>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`bg-white rounded-2xl p-8 ${
                plan.popular
                  ? "border-2 border-[#0D9488] shadow-lg relative"
                  : "border border-slate-200"
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0D9488] text-white">
                  Most Popular
                </Badge>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-semibold text-slate-900 mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-slate-900">
                    €{annual ? plan.annualPrice : plan.monthlyPrice}
                  </span>
                  <span className="text-slate-500">/month</span>
                </div>
                <p className="text-sm text-slate-500 mt-1">Monatlich abgerechnet</p>
                <p className="text-[#0D9488] font-semibold mt-2">{plan.matches}</p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-[#0D9488] flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                className={`w-full rounded-lg ${
                  plan.current
                    ? "bg-[#0D9488] hover:bg-[#0B7C72] text-white"
                    : "bg-slate-900 hover:bg-slate-800 text-white"
                }`}
              >
                <Link href="/auth/register">
                  {plan.current ? "Current Plan" : "Choose Plan"}
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
