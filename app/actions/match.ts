'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type MatchResult =
  | { allowed: true; remaining: number }
  | { allowed: false; reason: 'limit_reached'; used: number; limit: number }

export async function checkAndIncrementMatch(): Promise<MatchResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('matches_used, matches_limit')
    .eq('id', user.id)
    .single()

  if (!profile) throw new Error('Profile not found')

  if (profile.matches_used >= profile.matches_limit) {
    return {
      allowed: false,
      reason: 'limit_reached',
      used: profile.matches_used,
      limit: profile.matches_limit,
    }
  }

  await supabase
    .from('profiles')
    .update({ matches_used: profile.matches_used + 1 })
    .eq('id', user.id)

  revalidatePath('/jobs')
  revalidatePath('/candidates')

  return {
    allowed: true,
    remaining: profile.matches_limit - profile.matches_used - 1,
  }
}

export async function getMatchStatus() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('matches_used, matches_limit, plan')
    .eq('id', user.id)
    .single()

  return profile
}
