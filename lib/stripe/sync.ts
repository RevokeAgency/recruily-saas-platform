import { PLANS, type PlanId } from "@/lib/plans"
import { planFromLookupKey } from "@/lib/stripe/server"

/**
 * Webhook → user_profiles synchronisation. Pure data-mapping plus a single
 * update against a supabase-like client, so the logic is unit-testable
 * without Stripe or a database.
 */

type SupabaseLike = {
  from: (table: string) => {
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: string) => PromiseLike<{ error: { message: string } | null }>
    }
  }
}

export interface SubscriptionState {
  /** Explicit user id (checkout metadata) — wins over customer lookup. */
  userId?: string | null
  customerId: string
  subscriptionId: string | null
  /** Stripe subscription status, e.g. active | trialing | canceled | unpaid. */
  status: string
  /** lookup_key of the subscribed price. */
  lookupKey: string | null
  /** Unix seconds of current_period_end (null on deletion). */
  periodEnd: number | null
}

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"])

/** Maps a subscription state to the profile columns it should produce. */
export function profileUpdateFor(state: SubscriptionState): Record<string, unknown> {
  const mapped = planFromLookupKey(state.lookupKey)
  const isActive = ACTIVE_STATUSES.has(state.status) && mapped !== null

  const plan: PlanId = isActive ? mapped!.plan : "free"
  return {
    plan,
    matches_limit: PLANS[plan].matches,
    active_jobs_limit: PLANS[plan].active_jobs,
    billing_interval: isActive ? mapped!.interval : "monthly",
    billing_period_end: isActive && state.periodEnd
      ? new Date(state.periodEnd * 1000).toISOString()
      : null,
    stripe_customer_id: state.customerId,
    stripe_subscription_id: isActive ? state.subscriptionId : null,
  }
}

/**
 * Applies the state to user_profiles: by user id when known (checkout
 * metadata), otherwise by stripe_customer_id. Returns an error message or null.
 */
export async function syncSubscriptionToProfile(
  admin: SupabaseLike,
  state: SubscriptionState,
): Promise<string | null> {
  const update = profileUpdateFor(state)
  const query = admin.from("user_profiles").update(update)
  const { error } = state.userId
    ? await query.eq("id", state.userId)
    : await query.eq("stripe_customer_id", state.customerId)
  return error ? error.message : null
}
