-- 021_matching_v2.sql — IMLRS 2.0: evidence-based matching pipeline.
-- Additive & idempotent; safe to re-run.
--
-- The v2 pipeline separates extraction from judgment:
--   1. The candidate's FULL CV text is stored (resume_text) and normalised
--      into a cached career dossier (timeline, skill evidence, gaps …).
--   2. Hard facts (skill coverage, years, languages) are computed
--      deterministically in code.
--   3. An AI judge scores against a strict rubric with mandatory evidence,
--      then an independent AI verifier reviews every score.
-- The full reasoning trail is stored per match (match_detail) so results are
-- explainable and auditable (DSGVO / EU AI Act).

-- Full CV text + cached career dossier per candidate (reused across jobs).
alter table public.candidates
  add column if not exists resume_text text;

alter table public.candidates
  add column if not exists dossier jsonb;

alter table public.candidates
  add column if not exists dossier_updated_at timestamptz;

-- Per-match reasoning trail: per-category Begründung, Belege, Konfidenz,
-- deterministic hard-facts, verifier corrections.
alter table public.job_candidates
  add column if not exists match_detail jsonb;

-- Which engine produced the stored score ('imlrs-1' implicit / 'imlrs-2').
alter table public.job_candidates
  add column if not exists match_engine text;
