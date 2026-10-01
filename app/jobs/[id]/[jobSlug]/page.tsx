import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { PublicJobView, type PublicJob } from "@/components/public/public-job"
import { jobPostingJsonLd } from "@/lib/seo/job-posting"
import { absoluteUrl } from "@/lib/site"

export const dynamic = "force-dynamic"

// The public page resolves the customer + job through a SECURITY DEFINER RPC
// (scripts/012) callable with the anon key, so a shared job link renders
// without depending on the service-role key. The RPC returns only the public
// fields of the single matched job; user_profiles / jobs stay RLS-protected.
function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )
}

async function resolve(
  customerSlug: string,
  jobSlug: string,
): Promise<{ job: PublicJob; logoUrl: string | null; createdAt: string | null } | null> {
  const supabase = anonClient()
  const { data, error } = await supabase.rpc("public_job_by_slug", {
    p_customer_slug: customerSlug,
    p_job_slug: jobSlug,
  })
  if (error || !data) return null

  const d = data as Record<string, unknown>
  return {
    job: {
      id: d.id as string,
      title: d.title as string,
      company: d.company as string,
      location: (d.location as string) ?? null,
      employment_type: (d.employment_type as string) ?? null,
      description: (d.description as string) ?? null,
      required_skills: (d.required_skills as string[]) ?? null,
      years_experience: (d.years_experience as string) ?? null,
      // Seit Migration 032 liefert die Abfrage das Gehalt mit.
      salary_range: (d.salary_range as string) ?? null,
      is_active: Boolean(d.is_active),
    },
    logoUrl: (d.logo_url as string) ?? null,
    // Seit Migration 031 liefert die Abfrage das Veröffentlichungsdatum mit.
    createdAt: (d.created_at as string) ?? null,
  }
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
    alternates: { canonical: absoluteUrl(`/jobs/${customerSlug}/${jobSlug}`) },
    // Geschlossene Stellen raus aus dem Index, wie Google es für Jobs verlangt.
    ...(res.job.is_active ? {} : { robots: { index: false, follow: false } }),
  }
}

export default async function PublicJobPage(
  { params }: { params: Promise<{ id: string; jobSlug: string }> },
) {
  const { id: customerSlug, jobSlug } = await params
  const res = await resolve(customerSlug, jobSlug)
  if (!res) notFound()

  // Google for Jobs: strukturierte Daten für die Jobsuche (lib/seo/job-posting.ts).
  const jsonLd = jobPostingJsonLd(
    { ...res.job, created_at: res.createdAt },
    { url: absoluteUrl(`/jobs/${customerSlug}/${jobSlug}`), logoUrl: res.logoUrl },
  )

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          // "<" maskiert, damit Text aus der Stellenbeschreibung das Script-Tag nicht schließen kann.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
      )}
      <PublicJobView job={res.job} logoUrl={res.logoUrl} />
    </>
  )
}
