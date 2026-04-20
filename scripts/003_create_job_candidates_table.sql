-- Job-Candidates linking table for matching candidates to jobs
CREATE TABLE IF NOT EXISTS job_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'shortlisted', 'interviewed', 'rejected', 'hired')),
  match_score INTEGER,
  skills_score INTEGER,
  experience_score INTEGER,
  culture_score INTEGER,
  ai_summary TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(job_id, candidate_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_job_candidates_job_id ON job_candidates(job_id);
CREATE INDEX IF NOT EXISTS idx_job_candidates_candidate_id ON job_candidates(candidate_id);

-- Enable RLS
ALTER TABLE job_candidates ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (adjust for production)
CREATE POLICY "Allow all operations on job_candidates" ON job_candidates
  FOR ALL USING (true) WITH CHECK (true);
