'use server'
import { createClient as createServer } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { slugify } from '@/lib/email/routing'

function admin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

async function requireUser() {
  const supabase = await createServer()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Find a free slug based on `desired`, excluding the given user's own row.
 * Uses the service role because RLS hides other customers' profiles.
 */
async function freeSlug(db: ReturnType<typeof admin>, desired: string, selfId: string): Promise<string> {
  const base = slugify(desired) || 'kunde'
  let candidate = base
  let n = 1
  // Bounded loop — the unique index is the ultimate backstop.
  for (let i = 0; i < 50; i++) {
    const { data } = await db
      .from('user_profiles').select('id').eq('slug', candidate).neq('id', selfId).maybeSingle()
    if (!data) return candidate
    n += 1
    candidate = `${base}-${n}`
  }
  return `${base}-${Date.now().toString(36)}`
}

export async function checkSlugAvailable(value: string): Promise<{ available: boolean; suggestion: string }> {
  const user = await requireUser()
  if (!user) return { available: false, suggestion: '' }
  const db = admin()
  const base = slugify(value) || 'kunde'
  const { data } = await db
    .from('user_profiles').select('id').eq('slug', base).neq('id', user.id).maybeSingle()
  if (!data) return { available: true, suggestion: base }
  const suggestion = await freeSlug(db, value, user.id)
  return { available: false, suggestion }
}

export async function saveCompany(
  companyName: string,
  desiredSlug: string,
): Promise<{ ok: boolean; slug?: string; error?: string }> {
  const user = await requireUser()
  if (!user) return { ok: false, error: 'Nicht authentifiziert' }
  if (!companyName.trim()) return { ok: false, error: 'Firmenname erforderlich' }

  const db = admin()
  const slug = await freeSlug(db, desiredSlug || companyName, user.id)

  const { error } = await db
    .from('user_profiles')
    .update({ company_name: companyName.trim(), slug })
    .eq('id', user.id)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/settings')
  return { ok: true, slug }
}

/**
 * Update just the company name (Settings). Does NOT touch the slug — changing it
 * would break existing job-page URLs and email addresses.
 */
export async function updateCompanyName(name: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser()
  if (!user) return { ok: false, error: 'Nicht authentifiziert' }
  if (!name.trim()) return { ok: false, error: 'Firmenname erforderlich' }
  const db = admin()
  const { error } = await db.from('user_profiles').update({ company_name: name.trim() }).eq('id', user.id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/settings')
  return { ok: true }
}

export async function completeOnboarding(): Promise<{ ok: boolean }> {
  const user = await requireUser()
  if (!user) return { ok: false }
  const db = admin()
  await db.from('user_profiles').update({ onboarded: true }).eq('id', user.id)
  revalidatePath('/dashboard')
  return { ok: true }
}
