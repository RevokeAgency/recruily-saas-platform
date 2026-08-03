-- 020_interview_guide.sql — Structured interview guide + evaluation per
-- candidate/job link. Additive & idempotent; safe to re-run.
--
-- From the IMLRS score's weak/uncertain categories REVETLY generates a
-- structured interview guide (fixed questions + anchored rating scales). The
-- recruiter's ratings are stored back here so the whole selection chain —
-- screening → structured interview → decision — is documented and auditable.

alter table public.job_candidates
  add column if not exists interview_guide jsonb;          -- generated questions

alter table public.job_candidates
  add column if not exists interview_ratings jsonb;        -- recruiter ratings per question

alter table public.job_candidates
  add column if not exists interview_score numeric;        -- 0-100, avg of ratings

alter table public.job_candidates
  add column if not exists interview_notes text;           -- overall notes / recommendation

alter table public.job_candidates
  add column if not exists interview_completed_at timestamptz;
