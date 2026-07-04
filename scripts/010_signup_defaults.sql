-- ============================================================================
-- 010 — Signup defaults (Phase 1 bugfix)
--
-- Problem: the auth.users signup trigger still creates user_profiles rows
-- with the pre-launch defaults (matches_limit = 10, no onboarding flag), so
-- every new customer starts with the wrong free-plan limits and skips
-- onboarding bookkeeping.
--
-- This migration:
--   1. recreates handle_new_user() to insert into public.user_profiles with
--      the final free-plan limits (plan_match_limit/plan_job_limit from 006)
--      and onboarded = false (column from 009),
--   2. rebinds the on_auth_user_created trigger to it,
--   3. repairs existing rows whose limits don't match their plan
--      (enterprise is excluded — those limits are custom),
--   4. tightens the column defaults.
--
-- Requires: 006 (plan_match_limit / plan_job_limit), 009 (onboarded).
-- Idempotent — safe to run more than once.
-- ============================================================================

-- 1. Signup trigger function → user_profiles with final free-plan values
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles
    (id, first_name, last_name, plan, matches_used, matches_limit, active_jobs_limit, onboarded)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    'free',
    0,
    public.plan_match_limit('free'),
    public.plan_job_limit('free'),
    false
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- 2. Rebind the trigger (guarantees the function above is the one that runs)
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- 3. Repair rows created with the old defaults (e.g. free accounts with 10
--    matches). Enterprise keeps its custom limits.
update public.user_profiles
set matches_limit     = public.plan_match_limit(plan),
    active_jobs_limit = public.plan_job_limit(plan)
where plan <> 'enterprise'
  and (matches_limit     is distinct from public.plan_match_limit(plan)
    or active_jobs_limit is distinct from public.plan_job_limit(plan));

-- 4. Column defaults as a second line of defense
alter table public.user_profiles alter column matches_limit     set default 5;
alter table public.user_profiles alter column active_jobs_limit set default 1;
