import type { SupabaseClient } from "@supabase/supabase-js"
import type { PlanId } from "@/lib/plans"

/**
 * Match-quota helpers. Single source of truth for spending / reading a
 * customer's monthly AI-match quota. All match entry points must go through
 * `consumeMatch` so counting stays atomic (DB row lock) and bypass-free.
 *
 * The heavy lifting lives in Postgres (scripts/006_match_counter_system.sql):
 *   - consume_match(uuid): lazy calendar-month reset -> limit check -> atomic
 *     increment, returns { allowed, used, limit, remaining, reason }.
 *   - match_usage(uuid): read-only snapshot with the reset applied virtually.
 */

export type ConsumeResult = {
  allowed: boolean
  used?: number
  limit?: number
  remaining?: number
  reason?: "limit_reached" | "no_profile" | "forbidden"
}

export type MatchUsage = {
  used: number
  limit: number
  remaining: number
  active_jobs_limit: number
  plan: PlanId
}

/**
 * Atomically spend one match for `userId`. Returns `{ allowed: false }` when the
 * monthly limit is reached (the caller should then store the applicant without
 * scoring, or show an upgrade prompt). Fails closed on RPC errors.
 */
export async function consumeMatch(
  supabase: SupabaseClient,
  userId: string,
): Promise<ConsumeResult> {
  const { data, error } = await supabase.rpc("consume_match", { p_user: userId })
  if (error || !data) {
    console.error("consume_match RPC failed:", error)
    return { allowed: false, reason: "no_profile" }
  }
  return data as ConsumeResult
}

/** Read-only usage snapshot (monthly reset applied virtually, no write). */
export async function getMatchUsage(
  supabase: SupabaseClient,
  userId: string,
): Promise<MatchUsage | null> {
  const { data, error } = await supabase.rpc("match_usage", { p_user: userId })
  if (error || !data) return null
  return data as MatchUsage
}

/**
 * Whether the plan is entitled to the full 9-category IMLRS breakdown.
 * Free gets only the overall score ("Basic AI Matching Score"); every paid
 * plan gets the full "God Mode" breakdown.
 */
export function hasFullScore(plan: PlanId | string | null | undefined): boolean {
  return plan != null && plan !== "free"
}
