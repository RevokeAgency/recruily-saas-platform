// Plan definitions for Revetly subscription tiers.
// FINAL, BINDING PRICING (Phase 1). These values are the source of truth for
// display; enforcement limits are mirrored in the DB (plan_match_limit /
// plan_job_limit, zuletzt gesetzt in scripts/028_free_trial_lifetime.sql).
// Yearly price = 10x monthly (2 months free). active_jobs = 999 means unlimited.
//
// Free ist seit Migration 028 eine einmalige Probestelle, kein Dauertarif:
// quotaPeriod "lifetime" heißt, das Kontingent wird nie erneuert, und gezählt
// wird, was verbraucht beziehungsweise angelegt wurde. Die Regel selbst liegt
// in der Datenbank (consume_match, match_usage, job_quota). Hier stehen nur die
// Zahlen, und die müssen mit plan_match_limit / plan_job_limit übereinstimmen.
//
// Die features-Arrays folgen der Wortwahl der Landing Page. Die ersten zwei
// Einträge sind strukturell Kontingent und Stellen: Die Abo-Seite zeigt ab
// Index 2, die Paywall zeigt die ersten fünf.

export type QuotaPeriod = 'lifetime' | 'monthly'

const FREE_MATCHES = 25

export const PLANS = {
  free: {
    label: 'Free',
    price_monthly: 0,
    price_yearly: 0,
    matches: FREE_MATCHES,
    matches_label: `${FREE_MATCHES} Matches einmalig`,
    active_jobs: 1,
    jobs_label: '1 Probestelle',
    quotaPeriod: 'lifetime' as QuotaPeriod,
    basic_score: true,
    custom: false,
    featured: false,
    email_feature: false,
    features: [
      `${FREE_MATCHES} Matches einmalig`,
      '1 Probestelle',
      'Revetly Match Analyse mit Gesamtscore',
      'Lebenslauf-Upload, auch gescannte PDFs',
      'Öffentliche Bewerbungsseite',
      'Keine Kreditkarte',
    ],
  },
  starter: {
    label: 'Starter',
    price_monthly: 99,
    price_yearly: 990,
    matches: 50,
    matches_label: '50 Matches pro Monat',
    active_jobs: 3,
    jobs_label: '3 aktive Stellen',
    quotaPeriod: 'monthly' as QuotaPeriod,
    basic_score: false,
    custom: false,
    featured: false,
    email_feature: false,
    features: [
      '50 Matches pro Monat',
      '3 aktive Stellen',
      'Alle neun Ebenen mit Begründung und Belegen',
      'K.O.-Kriterien pro Stelle',
      'Bewerbungen per E-Mail an die Stellenadresse',
      'Terminbuchung mit Google- und Microsoft-Kalender',
      'Support per E-Mail',
    ],
  },
  growth: {
    label: 'Growth',
    price_monthly: 249,
    price_yearly: 2490,
    matches: 300,
    matches_label: '300 Matches pro Monat',
    active_jobs: 10,
    jobs_label: '10 aktive Stellen',
    quotaPeriod: 'monthly' as QuotaPeriod,
    basic_score: false,
    custom: false,
    featured: true,
    email_feature: true,
    features: [
      '300 Matches pro Monat',
      '10 aktive Stellen',
      'Absagen per E-Mail an Bewerber',
      'Talent-Pool: neue Stellen gegen alte Bewerber',
      'Strukturierte Interviewleitfäden',
      'Bestenvergleich innerhalb einer Stelle',
      'Auswertungen im Dashboard',
    ],
  },
  pro: {
    label: 'Pro',
    price_monthly: 499,
    price_yearly: 4990,
    matches: 1000,
    matches_label: '1.000 Matches pro Monat',
    active_jobs: 999,
    jobs_label: 'Unbegrenzt viele Stellen',
    quotaPeriod: 'monthly' as QuotaPeriod,
    basic_score: false,
    custom: false,
    featured: false,
    email_feature: true,
    features: [
      '1.000 Matches pro Monat',
      'Unbegrenzt viele Stellen',
      'Alles aus Growth',
      'Gewichtung lernt aus deinen Einstellungen',
      'Absagen per E-Mail an Bewerber',
      'Strukturierte Interviewleitfäden',
      'Vorrangiger Support',
    ],
  },
  enterprise: {
    label: 'Enterprise',
    price_monthly: 0,
    price_yearly: 0,
    matches: 1000,
    matches_label: 'Match-Volumen nach Absprache',
    active_jobs: 999,
    jobs_label: 'Unbegrenzt viele Stellen',
    quotaPeriod: 'monthly' as QuotaPeriod,
    basic_score: false,
    custom: true,
    featured: false,
    email_feature: true,
    features: [
      'Match-Volumen nach Absprache',
      'Unbegrenzt viele Stellen',
      'Verhandelbare Preise über dem Kontingent',
      'Alles aus Pro',
      'Fester Ansprechpartner',
      'Einrichtung und Schulung',
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
