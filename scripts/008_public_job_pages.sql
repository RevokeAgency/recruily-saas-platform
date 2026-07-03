-- ============================================================================
-- 008_public_job_pages.sql
-- Public Job Pages (Phase 1, Prompt 3)
--
-- Idempotent & additive. Adds a per-customer-unique public_slug to jobs (so the
-- clean URL revetly.ai/jobs/<customerSlug>/<jobSlug> resolves) and a customer
-- logo_url for branding. Requires 007 (slugify(), user_profiles.slug).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) jobs.public_slug — readable, unique within a customer.
-- ---------------------------------------------------------------------------
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS public_slug text;

-- Backfill existing jobs: slugify(title), disambiguated per owner by age.
WITH ranked AS (
  SELECT id,
         coalesce(nullif(public.slugify(title), ''), 'job') AS base,
         row_number() OVER (
           PARTITION BY user_id, coalesce(nullif(public.slugify(title), ''), 'job')
           ORDER BY created_at, id
         ) AS rn
  FROM public.jobs
  WHERE public_slug IS NULL
)
UPDATE public.jobs j
   SET public_slug = CASE WHEN r.rn = 1 THEN r.base ELSE r.base || '-' || r.rn END
  FROM ranked r
 WHERE j.id = r.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_user_public_slug
  ON public.jobs(user_id, public_slug);

-- Auto-assign a unique public_slug on insert (race-safe enough; the unique index
-- is the backstop). Runs only when the caller did not set one.
CREATE OR REPLACE FUNCTION public.set_job_public_slug()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  base text;
  candidate text;
  n int := 1;
BEGIN
  IF new.public_slug IS NOT NULL AND new.public_slug <> '' THEN
    RETURN new;
  END IF;
  base := coalesce(nullif(public.slugify(new.title), ''), 'job');
  candidate := base;
  WHILE EXISTS (
    SELECT 1 FROM public.jobs
    WHERE user_id = new.user_id AND public_slug = candidate AND id <> new.id
  ) LOOP
    n := n + 1;
    candidate := base || '-' || n;
  END LOOP;
  new.public_slug := candidate;
  RETURN new;
END $$;

DROP TRIGGER IF EXISTS jobs_set_public_slug ON public.jobs;
CREATE TRIGGER jobs_set_public_slug
  BEFORE INSERT ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_job_public_slug();

-- ---------------------------------------------------------------------------
-- 2) user_profiles.logo_url — company logo shown on the public job page.
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS logo_url text;

-- ---------------------------------------------------------------------------
-- 3) Auto-assign a customer slug on signup, so every NEW customer immediately
--    gets a working public page + job email (existing rows were backfilled in
--    007). The id suffix guarantees uniqueness.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_user_profile_slug()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF new.slug IS NOT NULL AND new.slug <> '' THEN
    RETURN new;
  END IF;
  new.slug := coalesce(
                nullif(public.slugify(coalesce(new.first_name, '') || '-' || coalesce(new.last_name, '')), ''),
                'kunde'
              ) || '-' || left(replace(new.id::text, '-', ''), 6);
  RETURN new;
END $$;

DROP TRIGGER IF EXISTS user_profiles_set_slug ON public.user_profiles;
CREATE TRIGGER user_profiles_set_slug
  BEFORE INSERT ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_user_profile_slug();
