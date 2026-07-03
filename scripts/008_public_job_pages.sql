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
