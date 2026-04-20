-- Add IMLRS 9-category scores to job_candidates table
-- This migration adds columns for all 9 IMLRS categories

-- Add new IMLRS category columns
ALTER TABLE job_candidates
ADD COLUMN IF NOT EXISTS hard_skills_score INTEGER,
ADD COLUMN IF NOT EXISTS experience_score INTEGER,
ADD COLUMN IF NOT EXISTS education_score INTEGER,
ADD COLUMN IF NOT EXISTS soft_skills_score INTEGER,
ADD COLUMN IF NOT EXISTS languages_score INTEGER,
ADD COLUMN IF NOT EXISTS location_score INTEGER,
ADD COLUMN IF NOT EXISTS industry_score INTEGER,
ADD COLUMN IF NOT EXISTS salary_score INTEGER,
ADD COLUMN IF NOT EXISTS career_prognosis TEXT CHECK (career_prognosis IN ('ascending', 'stable', 'risk')),
ADD COLUMN IF NOT EXISTS prognosis_reason TEXT,
ADD COLUMN IF NOT EXISTS why_they_fit TEXT[],
ADD COLUMN IF NOT EXISTS potential_concerns TEXT[],
ADD COLUMN IF NOT EXISTS interview_focus TEXT;

-- Rename culture_score if it exists (it was already there)
-- The existing culture_score column is already correct

-- Add comments for documentation
COMMENT ON COLUMN job_candidates.hard_skills_score IS 'IMLRS Hard Skills score (25% weight)';
COMMENT ON COLUMN job_candidates.experience_score IS 'IMLRS Experience score (20% weight)';
COMMENT ON COLUMN job_candidates.education_score IS 'IMLRS Education score (10% weight)';
COMMENT ON COLUMN job_candidates.soft_skills_score IS 'IMLRS Soft Skills score (10% weight)';
COMMENT ON COLUMN job_candidates.languages_score IS 'IMLRS Languages score (5% weight)';
COMMENT ON COLUMN job_candidates.location_score IS 'IMLRS Location score (5% weight)';
COMMENT ON COLUMN job_candidates.industry_score IS 'IMLRS Industry score (10% weight)';
COMMENT ON COLUMN job_candidates.salary_score IS 'IMLRS Salary score (5% weight)';
COMMENT ON COLUMN job_candidates.culture_score IS 'IMLRS Culture score (10% weight)';
COMMENT ON COLUMN job_candidates.career_prognosis IS 'Career trajectory: ascending, stable, or risk';
