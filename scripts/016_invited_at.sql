-- ============================================================================
-- 016 — Time-to-Interview measurement
--
-- Adds job_candidates.invited_at, set by the app the moment a candidate is
-- invited to an interview. Enables the dashboard's "Ø Zeit bis Einladung"
-- (time-to-interview) metric honestly: measured from application (created_at)
-- to invitation (invited_at). Historical invitations stay NULL — the metric
-- simply starts counting from now.
--
-- Also adds the standard updated_at maintenance trigger that job_candidates
-- was missing (jobs already has one).
--
-- Idempotent — safe to run more than once.
-- ============================================================================

alter table public.job_candidates
  add column if not exists invited_at timestamptz;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists job_candidates_touch_updated_at on public.job_candidates;
create trigger job_candidates_touch_updated_at
  before update on public.job_candidates
  for each row execute function public.touch_updated_at();
