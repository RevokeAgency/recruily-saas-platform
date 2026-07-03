-- ============================================================================
-- 007_email_inbound_system.sql
-- Email Inbound System (Phase 1, Prompt 2)
--
-- Idempotent & additive. Adds:
--   - a per-customer slug (subdomain / address key) on user_profiles,
--   - an inbound_emails log/queue table (backs the "Nicht zugeordnet" view),
--   - helper slugify().
-- The recipient scheme (subdomain vs single-domain) is decided at MX hookup;
-- the app routes on the stable job UUID either way.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) slugify(): lowercase, transliterate German umlauts, hyphenate.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.slugify(txt text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT trim(both '-' FROM regexp_replace(
    translate(lower(coalesce(txt, '')),
              'äöüßàâçéèêëîïôûùüÿñ', 'aousaaceeeeiioouuyn'),
    '[^a-z0-9]+', '-', 'g'));
$$;

-- ---------------------------------------------------------------------------
-- 2) user_profiles.slug — the customer's address key (subdomain). Unique.
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS slug text;

-- Backfill a unique, readable-ish slug for existing rows. The id suffix
-- guarantees uniqueness; customers can be given a nicer slug later.
UPDATE public.user_profiles
  SET slug = coalesce(nullif(public.slugify(first_name || '-' || last_name), ''), 'kunde')
             || '-' || left(replace(id::text, '-', ''), 6)
  WHERE slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_slug ON public.user_profiles(slug);

-- ---------------------------------------------------------------------------
-- 3) inbound_emails — every received application email. Resolved ones link to
--    a job + candidate; unresolved ones surface in the "Nicht zugeordnet" view.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inbound_emails (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- customer (job owner). NULL when the recipient could not be resolved to a
  -- customer — such rows are visible to no customer (service-role only).
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id        uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  candidate_id  uuid REFERENCES public.candidates(id) ON DELETE SET NULL,
  from_address  text,
  to_address    text,
  subject       text,
  body_text     text,
  status        text NOT NULL DEFAULT 'received'
                CHECK (status IN ('received','processed','assigned','unassigned','no_cv','error')),
  reason        text,
  attachments   jsonb DEFAULT '[]'::jsonb,
  raw           jsonb,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE public.inbound_emails ENABLE ROW LEVEL SECURITY;

-- A customer may only ever see / act on their OWN inbound emails. Inserts are
-- performed by the service role (webhook), which bypasses RLS and always sets
-- user_id to the resolved job owner — so an email can never surface for a wrong
-- customer.
DROP POLICY IF EXISTS inbound_emails_select_own ON public.inbound_emails;
CREATE POLICY inbound_emails_select_own ON public.inbound_emails
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS inbound_emails_update_own ON public.inbound_emails;
CREATE POLICY inbound_emails_update_own ON public.inbound_emails
  FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_inbound_emails_user_status
  ON public.inbound_emails(user_id, status);
CREATE INDEX IF NOT EXISTS idx_inbound_emails_created
  ON public.inbound_emails(created_at DESC);
