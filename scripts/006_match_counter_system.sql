-- ============================================================================
-- 006_match_counter_system.sql
-- Match-Counter System (Phase 1, Prompt 1)
--
-- Idempotent & additive: safe to run on the live DB. Adds monthly-reset
-- tracking, an atomic consume function, plan->limit helpers, a 'queued' status
-- for over-limit (unscored) applications, and 'enterprise' to the plan enum.
--
-- Reset strategy: CALENDAR MONTH, enforced lazily inside consume_match() using
-- Europe/Berlin time. No cron required, self-healing, manipulation-proof
-- (the period is derived from the server clock, never from user input).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) user_profiles: monthly-reset anchor
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS matches_period_start date;

-- Initialise the anchor to the current calendar month for existing rows.
UPDATE public.user_profiles
  SET matches_period_start = date_trunc('month', (now() AT TIME ZONE 'Europe/Berlin'))::date
  WHERE matches_period_start IS NULL;

ALTER TABLE public.user_profiles
  ALTER COLUMN matches_period_start
  SET DEFAULT date_trunc('month', (now() AT TIME ZONE 'Europe/Berlin'))::date;

-- ---------------------------------------------------------------------------
-- 2) plan enum: allow 'enterprise' (constraint name unknown on live DB, so we
--    find and drop any CHECK on `plan`, then re-add the full list).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE rel.relname = 'user_profiles'
      AND ns.nspname = 'public'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%plan%'
  LOOP
    EXECUTE format('ALTER TABLE public.user_profiles DROP CONSTRAINT %I', c.conname);
  END LOOP;

  -- NOT VALID: enforce on new/updated rows without failing on any legacy data.
  ALTER TABLE public.user_profiles
    ADD CONSTRAINT user_profiles_plan_check
    CHECK (plan IN ('free', 'starter', 'growth', 'pro', 'enterprise'))
    NOT VALID;
END $$;

-- ---------------------------------------------------------------------------
-- 3) job_candidates: add 'queued' status (over-limit application, stored but
--    not yet scored). Recreate the CHECK with the full status list.
-- ---------------------------------------------------------------------------
-- Includes the German workflow statuses the app already writes ('Eingeladen',
-- 'Abgesagt'). NOT VALID: enforce on new/updated rows without failing on legacy
-- rows that may still carry other historical status values.
ALTER TABLE public.job_candidates DROP CONSTRAINT IF EXISTS job_candidates_status_check;
ALTER TABLE public.job_candidates ADD CONSTRAINT job_candidates_status_check
  CHECK (status IN ('new', 'queued', 'analyzing', 'scored', 'error', 'stale',
                    'shortlisted', 'interviewed', 'rejected', 'hired',
                    'Eingeladen', 'Abgesagt'))
  NOT VALID;

-- Index to find queued (unscored) links per owner quickly for backfill.
CREATE INDEX IF NOT EXISTS idx_job_candidates_user_status
  ON public.job_candidates(user_id, status);

-- ---------------------------------------------------------------------------
-- 4) Plan -> limit helper functions (single source of truth in the DB).
--    Final, binding pricing. active_jobs = 999 is the "unlimited" sentinel
--    (matches existing app convention). Enterprise is configured manually.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.plan_match_limit(p_plan text)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_plan
    WHEN 'free'    THEN 5
    WHEN 'starter' THEN 50
    WHEN 'growth'  THEN 300
    WHEN 'pro'     THEN 1000
    ELSE 5
  END;
$$;

CREATE OR REPLACE FUNCTION public.plan_job_limit(p_plan text)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_plan
    WHEN 'free'    THEN 1
    WHEN 'starter' THEN 3
    WHEN 'growth'  THEN 10
    WHEN 'pro'     THEN 999
    ELSE 1
  END;
$$;

-- Backfill existing rows' limits from their plan so they reflect the final
-- pricing. Enterprise rows are left untouched (custom, manually configured).
UPDATE public.user_profiles
  SET matches_limit     = public.plan_match_limit(plan),
      active_jobs_limit = public.plan_job_limit(plan)
  WHERE plan <> 'enterprise';

-- ---------------------------------------------------------------------------
-- 5) Atomic consume_match(): lazy monthly reset -> limit check -> increment,
--    all under a row lock so concurrent scores cannot under-count.
--    Returns jsonb { allowed, used, limit, remaining, reason }.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consume_match(p_user uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used    integer;
  v_limit   integer;
  v_period  date;
  v_current date := date_trunc('month', (now() AT TIME ZONE 'Europe/Berlin'))::date;
BEGIN
  -- An authenticated user may only spend their OWN quota. The service_role
  -- (auth.uid() IS NULL) may pass any owner id (inbound public applications).
  IF auth.uid() IS NOT NULL AND p_user <> auth.uid() THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'forbidden');
  END IF;

  SELECT matches_used, matches_limit, COALESCE(matches_period_start, v_current)
    INTO v_used, v_limit, v_period
    FROM public.user_profiles
   WHERE id = p_user
   FOR UPDATE;                      -- row lock => atomic across concurrent calls

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'no_profile');
  END IF;

  -- Lazy calendar-month reset.
  IF v_period < v_current THEN
    v_used := 0;
    v_period := v_current;
  END IF;

  IF v_used >= v_limit THEN
    UPDATE public.user_profiles
       SET matches_used = v_used, matches_period_start = v_period
     WHERE id = p_user;
    RETURN jsonb_build_object('allowed', false, 'reason', 'limit_reached',
                              'used', v_used, 'limit', v_limit, 'remaining', 0);
  END IF;

  UPDATE public.user_profiles
     SET matches_used = v_used + 1, matches_period_start = v_period
   WHERE id = p_user;

  RETURN jsonb_build_object('allowed', true, 'used', v_used + 1, 'limit', v_limit,
                            'remaining', v_limit - v_used - 1);
END;
$$;

-- Read-only usage snapshot with the lazy reset applied *virtually* (no write),
-- so dashboards show a correct 0/limit at the start of a new month even before
-- the next consume happens.
CREATE OR REPLACE FUNCTION public.match_usage(p_user uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used integer; v_limit integer; v_jobs integer; v_period date; v_plan text;
  v_current date := date_trunc('month', (now() AT TIME ZONE 'Europe/Berlin'))::date;
BEGIN
  IF auth.uid() IS NOT NULL AND p_user <> auth.uid() THEN
    RETURN NULL;
  END IF;

  SELECT matches_used, matches_limit, active_jobs_limit, COALESCE(matches_period_start, v_current), plan
    INTO v_used, v_limit, v_jobs, v_period, v_plan
    FROM public.user_profiles WHERE id = p_user;

  IF NOT FOUND THEN RETURN NULL; END IF;
  IF v_period < v_current THEN v_used := 0; END IF;

  RETURN jsonb_build_object(
    'used', v_used, 'limit', v_limit, 'remaining', GREATEST(v_limit - v_used, 0),
    'active_jobs_limit', v_jobs, 'plan', v_plan
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_match(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.match_usage(uuid)   TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.plan_match_limit(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.plan_job_limit(text)   TO authenticated, service_role;
