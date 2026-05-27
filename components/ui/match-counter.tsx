'use client'
import { useProfile } from '@/lib/hooks/useProfile'
import { PLANS } from '@/lib/plans'
import { Zap } from 'lucide-react'

export function MatchCounter() {
  const { profile, loading } = useProfile()
  if (loading || !profile) return null

  const used = profile.matches_used
  const limit = profile.matches_limit
  const remaining = Math.max(0, limit - used)
  const pct = Math.min(100, (used / limit) * 100)
  const isEmpty = remaining === 0
  const isLow = remaining <= Math.ceil(limit * 0.2) && !isEmpty
  const planLabel = PLANS[profile.plan]?.label ?? 'Free'

  const barColor = isEmpty 
    ? 'bg-red-500'
    : isLow 
    ? 'bg-amber-400'
    : 'bg-[#0D9488]'

  return (
    <div className="mx-3 mb-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-[#0D9488]" />
          <span className="text-xs font-semibold text-slate-600">
            {planLabel} Plan
          </span>
        </div>
        <span className={`text-xs font-bold ${
          isEmpty ? 'text-red-500'
          : isLow ? 'text-amber-500'
          : 'text-[#0D9488]'
        }`}>
          {remaining} übrig
        </span>
      </div>

      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden mb-1.5">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-xs text-slate-400">
        {used} / {limit} Matches verwendet
      </p>

      {(isEmpty || isLow) && (
        <a 
          href="/subscription"
          className={`mt-2.5 flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg text-xs font-semibold text-white transition-colors ${
            isEmpty
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-[#0D9488] hover:bg-[#0B7C72]'
          }`}
        >
          <Zap className="w-3 h-3" />
          {isEmpty
            ? 'Limit erreicht — Jetzt upgraden'
            : 'Fast voll — Upgraden'}
        </a>
      )}
    </div>
  )
}
