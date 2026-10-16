'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PlanId } from '@/lib/plans'
import type { WorkspaceRole } from '@/lib/workspace'

export interface Profile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  plan: PlanId
  billing_interval: 'monthly' | 'yearly'
  matches_used: number
  matches_limit: number
  active_jobs_limit: number
  stripe_customer_id: string | null
  subscription_status: string
  billing_period_end: string | null
  slug: string | null
  company_name: string | null
  logo_url: string | null
  /** Mail bei jeder neuen Bewerbung (Migration 031, Standard an). */
  notify_applications_instant: boolean
  /** Tägliche Zusammenfassung neuer Bewerbungen (Migration 031, Standard aus). */
  notify_applications_daily: boolean
  /** Inhaber oder Mitglied im Team (Migration 035). */
  role: WorkspaceRole
  /** Wem die Daten gehören. Beim Inhaber gleich id. */
  workspace_owner_id: string
  /** false: Mitglied über dem Platzlimit gesperrt. */
  seat_active: boolean
  /** Gebuchte Zusatzplätze des Arbeitsbereichs. */
  extra_seats: number
  /** Mitglieder im Team ohne Inhaber (Migration 036). 0 = kein Team. */
  team_members: number
}

// Plan, Kontingent, Abrechnung und Firma gehören dem Arbeitsbereich. Für
// Mitglieder kommen sie aus dem Profil des Inhabers (lesbar über die
// Policy user_profiles_select_workspace aus 035), Name und Login bleiben die
// eigenen.
const WORKSPACE_FIELDS = [
  'plan', 'billing_interval', 'matches_used', 'matches_limit', 'active_jobs_limit',
  'stripe_customer_id', 'subscription_status', 'billing_period_end', 'slug',
  'company_name', 'logo_url', 'extra_seats',
] as const

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { 
      setLoading(false)
      return 
    }
    
    const { data: own } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Ohne Migration 035 fehlt die Funktion, dann ist jeder Inhaber.
    const { data: ws } = await supabase.rpc('my_workspace')
    const w = ws as { owner_id?: string; role?: WorkspaceRole; active?: boolean; members?: number } | null
    const role: WorkspaceRole = w?.role === 'member' ? 'member' : 'owner'
    const seatActive = w?.active !== false
    const ownerId = role === 'member' && seatActive && w?.owner_id ? w.owner_id : user.id

    let data = own
    if (own && ownerId !== user.id) {
      const { data: owner } = await supabase.from('user_profiles').select('*').eq('id', ownerId).single()
      if (owner) data = { ...own, ...Object.fromEntries(WORKSPACE_FIELDS.map((k) => [k, owner[k]])) }
    }

    if (data) {
      setProfile({
        id: data.id,
        email: user.email || '',
        first_name: data.first_name,
        last_name: data.last_name,
        plan: data.plan || 'free',
        billing_interval: data.billing_interval || 'monthly',
        matches_used: data.matches_used || 0,
        // ?? statt ||: 0 ist seit der Probestelle ein echter Wert.
        matches_limit: data.matches_limit ?? 0,
        active_jobs_limit: data.active_jobs_limit ?? 0,
        stripe_customer_id: data.stripe_customer_id || null,
        subscription_status: data.subscription_status || 'inactive',
        billing_period_end: data.billing_period_end || null,
        slug: data.slug || null,
        company_name: data.company_name || null,
        logo_url: data.logo_url || null,
        notify_applications_instant: data.notify_applications_instant ?? true,
        notify_applications_daily: data.notify_applications_daily ?? false,
        role,
        workspace_owner_id: ownerId,
        seat_active: seatActive,
        extra_seats: data.extra_seats ?? 0,
        team_members: Number(w?.members ?? 0),
      })
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()

    // Poll every 30s so the counter stays fresh
    const interval = setInterval(load, 30_000)

    // Refresh immediately when a match completes anywhere in the app
    const onMatchCompleted = () => load()
    window.addEventListener('match-completed', onMatchCompleted)

    // Refresh when the tab regains focus
    const onVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearInterval(interval)
      window.removeEventListener('match-completed', onMatchCompleted)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  return { profile, loading, refreshProfile: load }
}
