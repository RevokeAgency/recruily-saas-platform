-- ============================================================================
-- 009_onboarding.sql
-- Onboarding Flow (Phase 1, Prompt 5)
--
-- Idempotent & additive. Adds company_name + an onboarded flag to user_profiles.
-- Requires 007 (slugify, user_profiles.slug) and 008 (public_slug, slug trigger).
-- ============================================================================

ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS company_name text;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS onboarded boolean NOT NULL DEFAULT false;

-- Existing customers are already set up — never force them through onboarding.
-- "Has at least one job (or a company name)" is a stable proxy for "already
-- using the product", so this backfill is idempotent: it only ever flips
-- false -> true and never re-triggers onboarding for a genuine new signup.
UPDATE public.user_profiles p
   SET onboarded = true
 WHERE onboarded = false
   AND (
     company_name IS NOT NULL
     OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.user_id = p.id)
   );
