// Plan definitions for Recruily subscription tiers
// Used for displaying plan info and integrated with Stripe

export const PLANS = {
  free: {
    label: 'Free',
    price_monthly: 0,
    price_yearly: 0,
    matches: 10,
    matches_label: '10 Matches gesamt',
    active_jobs: 1,
    featured: false,
    email_feature: false,
    features: [
      '10 Matches gesamt',
      '1 aktiver Job',
      'IMLRS God Mode Score',
      'KI-Zusammenfassung',
      'Kandidaten-Pool',
      'Kein CC erforderlich',
    ],
  },
  starter: {
    label: 'Starter',
    price_monthly: 49,
    price_yearly: 490,
    matches: 50,
    matches_label: '50 Matches/Monat',
    active_jobs: 3,
    featured: false,
    email_feature: false,
    features: [
      '50 Matches/Monat',
      '3 aktive Jobs',
      'IMLRS God Mode Score',
      'KI-Zusammenfassung',
      'Analytics Dashboard',
      'CSV Export',
      'E-Mail Support',
    ],
  },
  growth: {
    label: 'Growth',
    price_monthly: 149,
    price_yearly: 1490,
    matches: 200,
    matches_label: '200 Matches/Monat',
    active_jobs: 10,
    featured: true,
    email_feature: true,
    features: [
      '200 Matches/Monat',
      '10 aktive Jobs',
      'IMLRS God Mode Score',
      'KI-Zusammenfassung',
      'Analytics Dashboard',
      'Custom KO-Kriterien',
      'Branded Absage-Emails',
      'Priority E-Mail Support',
    ],
  },
  pro: {
    label: 'Pro',
    price_monthly: 299,
    price_yearly: 2990,
    matches: 500,
    matches_label: '500 Matches/Monat',
    active_jobs: 999,
    featured: false,
    email_feature: true,
    features: [
      '500 Matches/Monat',
      'Unbegrenzte aktive Jobs',
      'IMLRS God Mode Score',
      'KI-Zusammenfassung',
      'Analytics Dashboard',
      'Custom KO-Kriterien',
      'Branded Absage-Emails',
      'Eigene Absender-Domain',
      'Priority Phone Support',
      'Dedicated Onboarding Call',
    ],
  },
} as const

export type PlanId = keyof typeof PLANS
export type Plan = typeof PLANS[PlanId]

export const getPlanByPriceId = (priceId: string): PlanId | null => {
  const map: Record<string, PlanId> = {
    [process.env.NEXT_PUBLIC_STRIPE_STARTER_MONTHLY_PRICE_ID || '']: 'starter',
    [process.env.NEXT_PUBLIC_STRIPE_STARTER_YEARLY_PRICE_ID || '']: 'starter',
    [process.env.NEXT_PUBLIC_STRIPE_GROWTH_MONTHLY_PRICE_ID || '']: 'growth',
    [process.env.NEXT_PUBLIC_STRIPE_GROWTH_YEARLY_PRICE_ID || '']: 'growth',
    [process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || '']: 'pro',
    [process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID || '']: 'pro',
  }
  return map[priceId] ?? null
}

export function getPlanByMatchLimit(limit: number): Plan {
  if (limit >= 500) return PLANS.pro
  if (limit >= 200) return PLANS.growth
  if (limit >= 50) return PLANS.starter
  return PLANS.free
}

export function getMatchLimitByPlan(planId: PlanId): number {
  return PLANS[planId].matches
}
