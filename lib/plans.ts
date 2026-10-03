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
// Index 2, die Paywall zeigt die ersten fünf. Ab Starter steht an Index 2
// "Alles aus <Vorgänger>", danach nur, was dazukommt. So steht jede Funktion
// genau einmal da, beim kleinsten Plan, der sie hat.
//
// Welche Funktion ab welchem Plan gilt, steht in FEATURE_MIN_PLAN unten.
// Durchgesetzt wird das in den Schnittstellen (requireFeature in
// lib/quota.ts), die Oberfläche zeigt nur den passenden Hinweis.

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
    features: [
      '50 Matches pro Monat',
      '3 aktive Stellen',
      'Alles aus Free',
      'Alle neun Ebenen mit Begründung und Belegen',
      'K.O.-Kriterien pro Stelle',
      'Bewerbungen per E-Mail an die Stellenadresse',
      'Recruiting-Kennzahlen im Dashboard',
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
    features: [
      '300 Matches pro Monat',
      '10 aktive Stellen',
      'Alles aus Starter',
      'Absagen per E-Mail',
      'Terminbuchung mit Google- und Microsoft-Kalender',
      'Talent-Pool: neue Stellen gegen alte Bewerber',
      'Strukturierte Interviewleitfäden',
      'Bestenvergleich innerhalb einer Stelle',
      'Ausführliche Statistiken pro Stelle',
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
    features: [
      '1.000 Matches pro Monat',
      'Unbegrenzt viele Stellen',
      'Alles aus Growth',
      'Gewichtung lernt aus deinen Einstellungen',
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
    features: [
      'Match-Volumen nach Absprache',
      'Unbegrenzt viele Stellen',
      'Alles aus Pro',
      'Verhandelbare Preise über dem Kontingent',
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

// ─────────────────────────────────────────────────────────────────────────────
// Funktionen nach Plan. Jede Funktion gilt ab dem genannten Plan und in allen
// größeren. Muss zur Preistabelle passen (components/landing/rv-pricing.tsx),
// tests/plans.test.ts prüft das.
// ─────────────────────────────────────────────────────────────────────────────

export const PLAN_ORDER: PlanId[] = ['free', 'starter', 'growth', 'pro', 'enterprise']

export const FEATURE_MIN_PLAN = {
  /** Bewerbungen per E-Mail an die Stellenadresse. */
  inbound_email: 'starter',
  /** Recruiting-Kennzahlen im Dashboard. */
  analytics_basic: 'starter',
  /** Statistiken pro Stelle und Match-Qualität. */
  analytics_full: 'growth',
  /** Absagen per E-Mail. */
  rejection_email: 'growth',
  /** Terminbuchung durch den Bewerber über den Kalender. */
  self_booking: 'growth',
  /** Talent-Pool: neue Stellen gegen frühere Bewerber. */
  talent_pool: 'growth',
  /** Strukturierte Interviewleitfäden. */
  interview_guide: 'growth',
  /** Bestenvergleich innerhalb einer Stelle. */
  pool_rank: 'growth',
} as const satisfies Record<string, PlanId>

export type Feature = keyof typeof FEATURE_MIN_PLAN

/** Hat der Plan die Funktion? Unbekannte oder fehlende Pläne bekommen nichts. */
export function hasFeature(plan: PlanId | string | null | undefined, feature: Feature): boolean {
  const have = PLAN_ORDER.indexOf(plan as PlanId)
  return have >= 0 && have >= PLAN_ORDER.indexOf(FEATURE_MIN_PLAN[feature])
}

/** Name des kleinsten Plans mit der Funktion, für Hinweise ("ab Growth"). */
export function featureFrom(feature: Feature): string {
  return PLANS[FEATURE_MIN_PLAN[feature]].label
}
