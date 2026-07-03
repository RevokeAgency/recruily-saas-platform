import { redirect } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { PublicJobView, type PublicJob } from "@/components/public/public-job"

export const dynamic = "force-dynamic"

// Legacy apply link (/apply/<jobId>). Resolves the clean URL and redirects so
// old links keep working; falls back to rendering in place if the customer has
// no slug yet.
export default async function LegacyApplyPage(
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data: job } = await supabase
    .from("jobs")
    .select("id, title, company, location, employment_type, description, required_skills, years_experience, is_active, public_slug, user_id")
    .eq("id", jobId)
    .single()

  if (!job) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--rv-mist)] px-4 text-center">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Stelle nicht gefunden</h1>
          <p className="mt-2 text-muted-foreground">Diese Stelle existiert nicht.</p>
        </div>
      </div>
    )
  }

  const { data: owner } = await supabase
    .from("user_profiles").select("slug, logo_url").eq("id", job.user_id).single()

  if (owner?.slug && job.public_slug) {
    redirect(`/jobs/${owner.slug}/${job.public_slug}`)
  }

  // Fallback: render in place (customer has no slug yet).
  return <PublicJobView job={job as PublicJob} logoUrl={owner?.logo_url ?? null} />
}
