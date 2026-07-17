-- ============================================================================
-- 015 — RLS hardening (close cross-tenant leaks)
--
-- Problem found in the audit: jobs, candidates and job_candidates had RLS
-- ENABLED but with permissive "USING (true)" policies — i.e. any authenticated
-- user could read/update/delete ANY customer's rows. user_profiles had no RLS
-- policies defined here at all.
--
-- This migration replaces the permissive policies with owner-scoped ones
-- (user_id = auth.uid()) and locks down user_profiles to the owner.
--
-- Safe because every public / cross-tenant read path already bypasses these
-- policies deliberately:
--   * Public job page (SSR)      -> SECURITY DEFINER rpc public_job_by_slug (012)
--   * Public apply page (SSR)    -> service role
--   * /api/public/*              -> service role
--   * consume_match / match_usage / onboarding -> SECURITY DEFINER
-- and every authenticated write sets user_id = auth.uid() (api/jobs,
-- api/candidates) or runs through the service role (inbound, apply, uploads).
--
-- Idempotent — safe to run more than once.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- jobs
-- ---------------------------------------------------------------------------
alter table public.jobs enable row level security;

drop policy if exists "Allow all select on jobs" on public.jobs;
drop policy if exists "Allow all insert on jobs" on public.jobs;
drop policy if exists "Allow all update on jobs" on public.jobs;
drop policy if exists "Allow all delete on jobs" on public.jobs;
drop policy if exists "jobs_select_own" on public.jobs;
drop policy if exists "jobs_insert_own" on public.jobs;
drop policy if exists "jobs_update_own" on public.jobs;
drop policy if exists "jobs_delete_own" on public.jobs;

create policy "jobs_select_own" on public.jobs
  for select using (user_id = auth.uid());
create policy "jobs_insert_own" on public.jobs
  for insert with check (user_id = auth.uid());
create policy "jobs_update_own" on public.jobs
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "jobs_delete_own" on public.jobs
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- candidates
-- ---------------------------------------------------------------------------
alter table public.candidates enable row level security;

drop policy if exists "Allow all select on candidates" on public.candidates;
drop policy if exists "Allow all insert on candidates" on public.candidates;
drop policy if exists "Allow all update on candidates" on public.candidates;
drop policy if exists "Allow all delete on candidates" on public.candidates;
drop policy if exists "candidates_select_own" on public.candidates;
drop policy if exists "candidates_insert_own" on public.candidates;
drop policy if exists "candidates_update_own" on public.candidates;
drop policy if exists "candidates_delete_own" on public.candidates;

create policy "candidates_select_own" on public.candidates
  for select using (user_id = auth.uid());
create policy "candidates_insert_own" on public.candidates
  for insert with check (user_id = auth.uid());
create policy "candidates_update_own" on public.candidates
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "candidates_delete_own" on public.candidates
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- job_candidates
-- ---------------------------------------------------------------------------
alter table public.job_candidates enable row level security;

drop policy if exists "Allow all operations on job_candidates" on public.job_candidates;
drop policy if exists "job_candidates_select_own" on public.job_candidates;
drop policy if exists "job_candidates_insert_own" on public.job_candidates;
drop policy if exists "job_candidates_update_own" on public.job_candidates;
drop policy if exists "job_candidates_delete_own" on public.job_candidates;

create policy "job_candidates_select_own" on public.job_candidates
  for select using (user_id = auth.uid());
create policy "job_candidates_insert_own" on public.job_candidates
  for insert with check (user_id = auth.uid());
create policy "job_candidates_update_own" on public.job_candidates
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "job_candidates_delete_own" on public.job_candidates
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- user_profiles — owner-only. Trigger inserts (handle_new_user) and the
-- SECURITY DEFINER RPCs bypass RLS, so this only affects direct client access.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'user_profiles') then

    execute 'alter table public.user_profiles enable row level security';

    execute 'drop policy if exists "user_profiles_select_own" on public.user_profiles';
    execute 'drop policy if exists "user_profiles_insert_own" on public.user_profiles';
    execute 'drop policy if exists "user_profiles_update_own" on public.user_profiles';

    execute 'create policy "user_profiles_select_own" on public.user_profiles
               for select using (id = auth.uid())';
    execute 'create policy "user_profiles_insert_own" on public.user_profiles
               for insert with check (id = auth.uid())';
    execute 'create policy "user_profiles_update_own" on public.user_profiles
               for update using (id = auth.uid()) with check (id = auth.uid())';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Storage buckets (documented, no change needed):
--   * resumes          — PRIVATE, no anon/authenticated policy => service-role
--                        only. Correct: CVs are never publicly readable.
--   * candidate-photos  — public read (014), used as avatar <img> src.
--   * logos             — public read (011), used on public job pages.
-- ---------------------------------------------------------------------------
