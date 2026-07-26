-- ============================================================================
-- 018 — Fix the stray on_plan_change trigger (matches_limit clamped to old values)
--
-- Root cause of "Pro shows 500 / Growth showed 200": a trigger that predates
-- these migrations —
--     on_plan_change BEFORE UPDATE OF plan ON user_profiles
--       EXECUTE FUNCTION sync_plan_limits()
-- — rewrote NEW.matches_limit / NEW.active_jobs_limit to OUTDATED hard-coded
-- numbers whenever `plan` changed. So the webhook wrote matches_limit = 1000
-- for Pro, then this trigger clobbered it back to 500 in the same UPDATE.
--
-- Fix: point sync_plan_limits() at the canonical limit functions
-- (plan_match_limit / plan_job_limit from 006, kept in sync with lib/plans.ts),
-- so the trigger becomes CORRECT and doubles as a safety net: any plan change
-- now always yields the right limits. Then repair existing rows.
--
-- Idempotent — safe to run more than once.
-- ============================================================================

-- 1) Re-assert the canonical limit functions (idempotent; must match lib/plans.ts).
create or replace function public.plan_match_limit(p_plan text)
returns integer language sql immutable as $$
  select case p_plan
    when 'free'    then 5
    when 'starter' then 50
    when 'growth'  then 300
    when 'pro'     then 1000
    else 5
  end;
$$;

create or replace function public.plan_job_limit(p_plan text)
returns integer language sql immutable as $$
  select case p_plan
    when 'free'    then 1
    when 'starter' then 3
    when 'growth'  then 10
    when 'pro'     then 999
    else 1
  end;
$$;

-- 2) Rewrite the trigger function to derive limits from the canonical source.
--    Enterprise is left untouched (custom, manually configured).
create or replace function public.sync_plan_limits()
returns trigger language plpgsql as $$
begin
  if NEW.plan is distinct from 'enterprise' then
    NEW.matches_limit     := public.plan_match_limit(NEW.plan);
    NEW.active_jobs_limit := public.plan_job_limit(NEW.plan);
  end if;
  return NEW;
end;
$$;

-- 3) Repair existing rows that the old trigger left with wrong limits.
--    (This UPDATE doesn't touch `plan`, so the BEFORE UPDATE OF plan trigger
--    does not fire — the values are written directly.)
update public.user_profiles
   set matches_limit     = public.plan_match_limit(plan),
       active_jobs_limit = public.plan_job_limit(plan)
 where plan <> 'enterprise'
   and (matches_limit     is distinct from public.plan_match_limit(plan)
     or active_jobs_limit is distinct from public.plan_job_limit(plan));
