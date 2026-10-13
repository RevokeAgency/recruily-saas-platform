'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { consumeMatch, getMatchUsage } from '@/lib/quota'
import { scoreJobCandidateLink } from '@/lib/scoring'
import { getWorkspace } from "@/lib/workspace"

export type MatchResult =
  | { allowed: true; remaining: number }
  | { allowed: false; reason: 'limit_reached'; used: number; limit: number }

/**
 * Atomically spend one match for the current user. Backed by the DB
 * consume_match() function (row-locked, monthly-reset aware), so concurrent
 * calls cannot under-count and the counter cannot be reset by deleting jobs.
 */
export async function checkAndIncrementMatch(): Promise<MatchResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { ownerId } = await getWorkspace(supabase, user.id)

  const res = await consumeMatch(supabase, ownerId)

  if (!res.allowed) {
    return {
      allowed: false,
      reason: 'limit_reached',
      used: res.used ?? 0,
      limit: res.limit ?? 0,
    }
  }

  revalidatePath('/jobs')
  revalidatePath('/candidates')

  return { allowed: true, remaining: res.remaining ?? 0 }
}

export async function getMatchStatus() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { ownerId } = await getWorkspace(supabase, user.id)
  return getMatchUsage(supabase, ownerId)
}

// Score at most this many queued applications per backfill run, to bound
// serverless execution time (the rest are picked up on the next run).
const BACKFILL_BATCH = 25

/**
 * Re-scores applications that were stored while the customer was over their
 * limit (status 'queued'). Called after the monthly reset or an upgrade frees
 * quota. Scores oldest-first, consuming one match per application, and stops as
 * soon as the quota is exhausted again.
 */
export async function rescoreQueuedMatches(): Promise<{ scored: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { scored: 0 }
  const { ownerId } = await getWorkspace(supabase, user.id)

  const { data: queued } = await supabase
    .from('job_candidates')
    .select('id')
    .eq('user_id', ownerId)
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(BACKFILL_BATCH)

  let scored = 0
  for (const link of queued || []) {
    const res = await consumeMatch(supabase, ownerId)
    if (!res.allowed) break
    await supabase.from('job_candidates').update({ status: 'analyzing' }).eq('id', link.id)
    await scoreJobCandidateLink(supabase, link.id)
    scored++
  }

  if (scored > 0) {
    revalidatePath('/candidates')
    revalidatePath('/dashboard')
  }
  return { scored }
}
