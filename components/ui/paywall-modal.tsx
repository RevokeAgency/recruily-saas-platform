'use client'
import { useState } from 'react'
import { X, Check, Zap } from 'lucide-react'
import { PLANS, type PlanId } from '@/lib/plans'

interface Props {
  isOpen: boolean
  onClose: () => void
  matchesUsed: number
}

export function PaywallModal({ isOpen, onClose, matchesUsed }: Props) {
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly')
  if (!isOpen) return null

  const paidPlans: PlanId[] = ['starter', 'growth', 'pro']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-8 py-6 relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-[var(--rv-green)] flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-[#14B8A6] text-sm font-semibold">
              Match-Limit erreicht
            </span>
          </div>
          <h2 className="text-xl font-bold text-white">
            Du hast alle {matchesUsed} Matches verwendet.
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Wähle einen Plan — kein Risiko, jederzeit kündbar.
          </p>

          {/* Toggle */}
          <div className="flex items-center gap-2 mt-4">
            {(['monthly', 'yearly'] as const).map((i) => (
              <button 
                key={i} 
                onClick={() => setInterval(i)}
                className={`text-sm font-medium px-4 py-1.5 rounded-full transition-colors ${
                  interval === i
                    ? 'bg-[var(--rv-green)] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {i === 'monthly' ? 'Monatlich' : 'Jährlich'}
                {i === 'yearly' && (
                  <span className="ml-1.5 bg-green-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                    2 Mo. gratis
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plan Cards */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {paidPlans.map((planId) => {
            const plan = PLANS[planId]
            const price = interval === 'yearly'
              ? Math.round(plan.price_yearly / 12)
              : plan.price_monthly

            return (
              <div 
                key={planId}
                className={`relative rounded-xl border-2 p-5 flex flex-col ${
                  plan.featured
                    ? 'border-[var(--rv-green)] shadow-lg'
                    : 'border-slate-200'
                }`}
              >
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="bg-[var(--rv-green)] text-white text-xs font-bold px-3 py-1 rounded-full">
                      Beliebteste Wahl
                    </span>
                  </div>
                )}

                <p className="font-bold text-slate-900">{plan.label}</p>
                <div className="flex items-end gap-1 mt-1">
                  <span className="text-3xl font-extrabold text-slate-900">
                    €{price}
                  </span>
                  <span className="text-slate-500 text-sm mb-0.5">/Mo</span>
                </div>
                {interval === 'yearly' && (
                  <p className="text-xs text-green-600 font-medium mt-0.5">
                    €{plan.price_yearly}/Jahr — 2 Mo. gratis
                  </p>
                )}
                <p className="text-[var(--rv-green)] font-semibold text-sm mt-2">
                  {plan.matches_label}
                </p>
                <p className="text-slate-400 text-xs mt-0.5 mb-3">
                  {plan.active_jobs === 999
                    ? 'Unbegrenzte Jobs'
                    : `${plan.active_jobs} aktive Jobs`}
                </p>

                <ul className="space-y-1.5 mb-5 flex-1">
                  {plan.features.slice(0, 5).map((f) => (
                    <li 
                      key={f}
                      className="flex items-start gap-2 text-xs text-slate-600"
                    >
                      <Check className="w-3.5 h-3.5 text-[var(--rv-green)] flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <a 
                  href="/subscription"
                  className={`w-full py-2.5 rounded-lg text-sm font-semibold text-center transition-colors block ${
                    plan.featured
                      ? 'bg-[var(--rv-green)] hover:bg-[var(--rv-green-deep)] text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  Jetzt upgraden
                </a>
              </div>
            )
          })}
        </div>

        <p className="text-center text-xs text-slate-400 pb-5">
          Sichere Zahlung via Stripe · Jederzeit kündbar · DSGVO-konform
        </p>
      </div>
    </div>
  )
}
