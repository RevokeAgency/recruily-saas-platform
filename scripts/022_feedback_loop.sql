-- 022_feedback_loop.sql — Matching-Feedback-Loop + Bestenvergleich.
-- Additive & idempotent; safe to re-run.
--
-- (1) Outcome tracking: 'Eingestellt' (hired) completes the decision chain
--     Score → Interview → Hire. hired_at records when.
-- (2) Nightly calibration (cron): per-tenant statistics on how well match
--     scores predicted the tenant's own decisions, plus carefully bounded
--     per-tenant IMLRS weight adjustments. Aggregate statistics only —
--     no model training on personal data (DSGVO).
-- (3) Pool ranking ("Bestenvergleich"): comparative ranking of a job's
--     scored candidates against each other.

-- Outcome tracking on the candidate/job link.
alter table public.job_candidates
  add column if not exists hired_at timestamptz;

-- Bestenvergleich result per link.
alter table public.job_candidates
  add column if not exists pool_rank integer;

alter table public.job_candidates
  add column if not exists pool_rank_reason text;

alter table public.job_candidates
  add column if not exists pool_ranked_at timestamptz;

-- Per-tenant calibration: report (jsonb) + bounded weight overrides.
alter table public.user_profiles
  add column if not exists match_calibration jsonb;

alter table public.user_profiles
  add column if not exists imlrs_weights jsonb;
