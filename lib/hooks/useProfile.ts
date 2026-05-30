'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PlanId } from '@/lib/plans'

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
}

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
    
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (data) {
      setProfile({
        id: data.id,
        email: user.email || '',
        first_name: data.first_name,
        last_name: data.last_name,
        plan: data.plan || 'free',
        billing_interval: data.billing_interval || 'monthly',
        matches_used: data.matches_used || 0,
        matches_limit: data.matches_limit || 10,
        active_jobs_limit: data.active_jobs_limit || 1,
        stripe_customer_id: data.stripe_customer_id || null,
        subscription_status: data.subscription_status || 'inactive',
        billing_period_end: data.billing_period_end || null,
      })
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return { profile, loading, refreshProfile: load }
}
