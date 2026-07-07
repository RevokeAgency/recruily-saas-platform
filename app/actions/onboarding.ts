'use server'
import { createClient as createServer } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * All onboarding actions are the signed-in user editing their OWN profile row,
 * so they run through the normal authenticated server client (anon key + the
 * user's session). Slug uniqueness needs to see other customers' rows, which
 * RLS hides — that cross-row visibility lives in the SECURITY DEFINER RPCs
 * `company_slug_status` / `save_company` (migration 011), not in a service-role
 * key held by the app.
 */

export async function checkSlugAvailable(
  value: string,
): Promise<{ available: boolean; suggestion: string }> {
  const supabase = await createServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { available: false, suggestion: '' }

  const { data, error } = await supabase.rpc('company_slug_status', { p_value: value })
  if (error || !data) return { available: false, suggestion: '' }
  return {
    available: Boolean((data as { available?: boolean }).available),
    suggestion: (data as { suggestion?: string }).suggestion ?? '',
  }
}

export async function saveCompany(
  companyName: string,
  desiredSlug: string,
): Promise<{ ok: boolean; slug?: string; error?: string }> {
  const supabase = await createServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Nicht authentifiziert' }
  if (!companyName.trim()) return { ok: false, error: 'Firmenname erforderlich' }

  const { data, error } = await supabase.rpc('save_company', {
    p_company_name: companyName,
    p_slug: desiredSlug,
  })
  if (error) return { ok: false, error: error.message }

  revalidatePath('/settings')
  return { ok: true, slug: data as string }
}

/**
 * Update just the company name (Settings). Does NOT touch the slug — changing it
 * would break existing job-page URLs and email addresses.
 */
export async function updateCompanyName(name: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Nicht authentifiziert' }
  if (!name.trim()) return { ok: false, error: 'Firmenname erforderlich' }

  const { error } = await supabase
    .from('user_profiles')
    .update({ company_name: name.trim() })
    .eq('id', user.id)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/settings')
  return { ok: true }
}

export async function completeOnboarding(): Promise<{ ok: boolean }> {
  const supabase = await createServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }

  await supabase.from('user_profiles').update({ onboarded: true }).eq('id', user.id)
  revalidatePath('/dashboard')
  return { ok: true }
}
