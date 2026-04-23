"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.5, ease: "easeOut" }
}

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
      {/* Minimal arc - left */}
      <svg className="absolute left-0 bottom-1/4 w-32 h-32 pointer-events-none opacity-20" viewBox="0 0 100 100">
        <path d="M0 100 Q 0 0, 100 0" fill="none" stroke="#94a3b8" strokeWidth="1" />
        <path d="M0 100 Q 0 20, 80 0" fill="none" stroke="#94a3b8" strokeWidth="1" />
      </svg>

      {/* Subtle gradient blob - right */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[350px] h-[350px] pointer-events-none">
        <div className="w-full h-full rounded-full bg-gradient-to-l from-slate-200/50 to-transparent" style={{ clipPath: "inset(0 0 0 50%)" }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <motion.div 
          className="text-center mb-12"
          {...fadeInUp}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-slate-600">
            Choose the plan that works best for your business.
          </p>
        </motion.div>

        {/* Toggle */}
        <motion.div 
          className="flex items-center justify-center gap-4 mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
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
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              className={`bg-white rounded-2xl p-8 ${
                plan.popular
                  ? "border-2 border-[#0D9488] shadow-lg relative"
                  : "border border-slate-200"
              }`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, ease: "easeOut", delay: i * 0.1 }}
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
                {plan.features.map((feature, j) => (
                  <motion.li 
                    key={j} 
                    className="flex items-start gap-3"
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + j * 0.05 }}
                  >
                    <Check className="h-5 w-5 text-[#0D9488] flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600">{feature}</span>
                  </motion.li>
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
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
