-- 019_ko_criteria.sql — Knockout ("KO") criteria per job + evaluation result
-- per candidate link. Additive & idempotent; safe to re-run.
--
-- KO criteria are hard requirements a recruiter defines on a job (e.g.
-- "Führerschein Klasse B", "Arbeitsberechtigung in Österreich", "Deutsch C1").
-- The IMLRS matcher evaluates each candidate against them and flags anyone who
-- clearly fails one. Flagged candidates keep their explanatory score but are
-- marked KO in the UI and sorted to the bottom — they are never auto-deleted.

-- Per-job list of KO criteria (free text, like required_skills).
alter table public.jobs
  add column if not exists ko_criteria text[] not null default '{}';

-- Per candidate-link KO result.
alter table public.job_candidates
  add column if not exists knockout boolean not null default false;

alter table public.job_candidates
  add column if not exists knockout_reasons text[] not null default '{}';

-- Fast lookup of knocked-out candidates within a job.
create index if not exists job_candidates_knockout_idx
  on public.job_candidates (job_id, knockout);
