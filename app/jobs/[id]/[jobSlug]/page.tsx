import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { PublicJobView, type PublicJob } from "@/components/public/public-job"

export const dynamic = "force-dynamic"

// Service-role read: user_profiles is RLS-protected, so the public page resolves
// the customer + job server-side with the service key (never exposed to the client).
function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

async function resolve(customerSlug: string, jobSlug: string): Promise<{ job: PublicJob; logoUrl: string | null } | null> {
  const supabase = admin()
  const { data: owner } = await supabase
    .from("user_profiles").select("id, logo_url").eq("slug", customerSlug).single()
  if (!owner) return null

  const { data: job } = await supabase
    .from("jobs")
    .select("id, title, company, location, employment_type, description, required_skills, years_experience, is_active")
    .eq("user_id", owner.id)
    .eq("public_slug", jobSlug)
    .single()
  if (!job) return null

  return { job: job as PublicJob, logoUrl: owner.logo_url ?? null }
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string; jobSlug: string }> },
): Promise<Metadata> {
  const { id: customerSlug, jobSlug } = await params
  const res = await resolve(customerSlug, jobSlug)
  if (!res) return { title: "Stelle nicht gefunden" }
  return {
    title: `${res.job.title} · ${res.job.company}`,
    description: `Jetzt bewerben als ${res.job.title} bei ${res.job.company}.`,
  }
}

export default async function PublicJobPage(
  { params }: { params: Promise<{ id: string; jobSlug: string }> },
) {
  const { id: customerSlug, jobSlug } = await params
  const res = await resolve(customerSlug, jobSlug)
  if (!res) notFound()
  return <PublicJobView job={res.job} logoUrl={res.logoUrl} />
}
