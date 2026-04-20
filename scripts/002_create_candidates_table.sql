-- Create candidates table for storing CV data
CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  job_title TEXT,
  years_of_experience INTEGER DEFAULT 0,
  experience_level TEXT CHECK (experience_level IN ('junior', 'mid', 'senior')) DEFAULT 'mid',
  skills TEXT[] DEFAULT '{}',
  education TEXT,
  summary_ai TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

-- Create permissive policies (for demo purposes - in production, scope to user)
CREATE POLICY "Allow all select on candidates" ON candidates FOR SELECT USING (true);
CREATE POLICY "Allow all insert on candidates" ON candidates FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on candidates" ON candidates FOR UPDATE USING (true);
CREATE POLICY "Allow all delete on candidates" ON candidates FOR DELETE USING (true);

-- Create index on skills for faster matching
CREATE INDEX IF NOT EXISTS idx_candidates_skills ON candidates USING GIN (skills);
