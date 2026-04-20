-- Fix the status CHECK constraint to include new statuses for IMLRS
ALTER TABLE job_candidates DROP CONSTRAINT IF EXISTS job_candidates_status_check;

ALTER TABLE job_candidates ADD CONSTRAINT job_candidates_status_check 
  CHECK (status IN ('new', 'analyzing', 'scored', 'error', 'stale', 'shortlisted', 'interviewed', 'rejected', 'hired'));
