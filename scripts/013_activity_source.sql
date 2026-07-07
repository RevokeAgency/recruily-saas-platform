-- ============================================================================
-- 013 — Track how a candidate entered a job (for the activity feed)
--
-- Adds job_candidates.source so the sidebar activity feed can say where an
-- application came from ("per Public Page", "per E-Mail", "manuell"). Purely
-- additive; existing rows default to 'manual'.
--
-- Values: 'manual' | 'public_page' | 'email'
-- Idempotent — safe to run more than once.
-- ============================================================================

alter table public.job_candidates
  add column if not exists source text not null default 'manual';

-- Keep it to the known set without failing on any legacy value.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'job_candidates_source_check'
  ) then
    alter table public.job_candidates
      add constraint job_candidates_source_check
      check (source in ('manual', 'public_page', 'email')) not valid;
  end if;
end $$;
