-- ============================================================================
-- 012 — Public job page resolves without the service-role key (bugfix)
--
-- Problem: opening a public job link (/jobs/<company>/<job>) returned 404.
-- The page resolved the customer + job with the Supabase SERVICE_ROLE key,
-- which isn't set in the deployment, so the lookup failed -> notFound().
--
-- Rendering a shared job link must never depend on a server secret. This adds
-- a SECURITY DEFINER function that returns just the public fields of one job
-- (looked up by company slug + job slug) and is callable by anonymous
-- visitors. user_profiles / jobs stay RLS-protected; only these public columns
-- of the single matched job are exposed.
--
-- Requires: 007 (user_profiles.slug), 008 (jobs.public_slug, logo_url).
-- Idempotent — safe to run more than once.
-- ============================================================================

create or replace function public.public_job_by_slug(p_customer_slug text, p_job_slug text)
returns json
language sql
security definer
set search_path = public
stable
as $$
  select json_build_object(
    'id',                j.id,
    'title',             j.title,
    'company',           j.company,
    'location',          j.location,
    'employment_type',   j.employment_type,
    'description',       j.description,
    'required_skills',   j.required_skills,
    'years_experience',  j.years_experience,
    'is_active',         j.is_active,
    'logo_url',          p.logo_url
  )
  from public.jobs j
  join public.user_profiles p on p.id = j.user_id
  where p.slug = p_customer_slug
    and j.public_slug = p_job_slug
  limit 1;
$$;

grant execute on function public.public_job_by_slug(text, text) to anon, authenticated;
