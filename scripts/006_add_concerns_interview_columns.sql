-- Add columns for potential concerns and interview focus
ALTER TABLE job_candidates 
ADD COLUMN IF NOT EXISTS potential_concerns TEXT,
ADD COLUMN IF NOT EXISTS interview_focus TEXT,
ADD COLUMN IF NOT EXISTS prognosis_reason TEXT;
