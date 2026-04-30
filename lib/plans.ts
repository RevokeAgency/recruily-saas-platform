// Plan definitions for Recruily subscription tiers
// Used for displaying plan info and will be integrated with Stripe later

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    nameDE: 'Kostenlos',
    matchesLimit: 10,
    price: 0,
    priceId: null, // Stripe price ID will be added later
    features: [
      '10 KI-Matches pro Monat',
      'Basis-Kandidatensuche',
      'E-Mail-Support',
    ],
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    nameDE: 'Starter',
    matchesLimit: 50,
    price: 49,
    priceId: null,
    features: [
      '50 KI-Matches pro Monat',
      'Erweiterte Filteroptionen',
      'Kandidaten-Export',
      'Prioritäts-Support',
    ],
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    nameDE: 'Growth',
    matchesLimit: 200,
    price: 99,
    priceId: null,
    features: [
      '200 KI-Matches pro Monat',
      'Team-Kollaboration (3 Nutzer)',
      'API-Zugang',
      'Dedizierter Account Manager',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    nameDE: 'Pro',
    matchesLimit: 500,
    price: 199,
    priceId: null,
    features: [
      '500 KI-Matches pro Monat',
      'Unbegrenzte Team-Mitglieder',
      'White-Label-Option',
      'Custom Integrationen',
      '24/7 Premium-Support',
    ],
  },
} as const

export type PlanId = keyof typeof PLANS
export type Plan = typeof PLANS[PlanId]

export function getPlanByMatchLimit(limit: number): Plan {
  if (limit >= 500) return PLANS.pro
  if (limit >= 200) return PLANS.growth
  if (limit >= 50) return PLANS.starter
  return PLANS.free
}

export function getMatchLimitByPlan(planId: PlanId): number {
  return PLANS[planId].matchesLimit
}
