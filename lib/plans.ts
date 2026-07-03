// Plan definitions for Revetly subscription tiers.
// FINAL, BINDING PRICING (Phase 1). These values are the source of truth for
// display; enforcement limits are mirrored in the DB (plan_match_limit /
// plan_job_limit in scripts/006_match_counter_system.sql).
// Yearly price = 10x monthly (2 months free). active_jobs = 999 means unlimited.

export const PLANS = {
  free: {
    label: 'Free',
    price_monthly: 0,
    price_yearly: 0,
    matches: 5,
    matches_label: '5 Matches/Monat',
    active_jobs: 1,
    basic_score: true,
    custom: false,
    featured: false,
    email_feature: false,
    features: [
      '5 Matches/Monat',
      '1 aktiver Job',
      'Basic AI Matching Score',
      'Kandidaten-Pool',
      'Kein CC erforderlich',
    ],
  },
  starter: {
    label: 'Starter',
    price_monthly: 99,
    price_yearly: 990,
    matches: 50,
    matches_label: '50 Matches/Monat',
    active_jobs: 3,
    basic_score: false,
    custom: false,
    featured: false,
    email_feature: false,
    features: [
      '50 Matches/Monat',
      '3 aktive Jobs',
      'Voller IMLRS Score (9 Kategorien)',
      'KI-Zusammenfassung',
      'Analytics Dashboard',
      'CSV Export',
      'E-Mail Support',
    ],
  },
  growth: {
    label: 'Growth',
    price_monthly: 249,
    price_yearly: 2490,
    matches: 300,
    matches_label: '300 Matches/Monat',
    active_jobs: 10,
    basic_score: false,
    custom: false,
    featured: true,
    email_feature: true,
    features: [
      '300 Matches/Monat',
      '10 aktive Jobs',
      'Voller IMLRS Score (9 Kategorien)',
      'KI-Zusammenfassung',
      'Analytics Dashboard',
      'Custom KO-Kriterien',
      'Branded Absage-Emails',
      'Priority E-Mail Support',
    ],
  },
  pro: {
    label: 'Pro',
    price_monthly: 499,
    price_yearly: 4990,
    matches: 1000,
    matches_label: '1.000 Matches/Monat',
    active_jobs: 999,
    basic_score: false,
    custom: false,
    featured: false,
    email_feature: true,
    features: [
      '1.000 Matches/Monat',
      'Unbegrenzte aktive Jobs',
      'Voller IMLRS Score (9 Kategorien)',
      'KI-Zusammenfassung',
      'Analytics Dashboard',
      'Custom KO-Kriterien',
      'Branded Absage-Emails',
      'Eigene Absender-Domain',
      'Priority Phone Support',
      'Dedicated Onboarding Call',
    ],
  },
  enterprise: {
    label: 'Enterprise',
    price_monthly: 0,
    price_yearly: 0,
    matches: 1000,
    matches_label: 'Individuelles Match-Volumen',
    active_jobs: 999,
    basic_score: false,
    custom: true,
    featured: false,
    email_feature: true,
    features: [
      'Individuelles Match-Volumen',
      'Unbegrenzte aktive Jobs',
      'Verhandelbare Overage-Preise',
      'Voller IMLRS Score (9 Kategorien)',
      'SLA & Dedicated Support',
      'Custom Onboarding',
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
  if (limit >= 1000) return PLANS.pro
  if (limit >= 300) return PLANS.growth
  if (limit >= 50) return PLANS.starter
  return PLANS.free
}

export function getMatchLimitByPlan(planId: PlanId): number {
  return PLANS[planId].matches
}
