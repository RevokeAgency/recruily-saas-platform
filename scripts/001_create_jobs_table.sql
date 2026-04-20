-- Create jobs table
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  employment_type TEXT DEFAULT 'full-time',
  salary_range TEXT,
  description TEXT,
  required_skills TEXT[] DEFAULT '{}',
  nice_to_have_skills TEXT[] DEFAULT '{}',
  years_experience TEXT,
  education TEXT,
  languages TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  candidate_count INTEGER DEFAULT 0,
  top_match_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS jobs_is_active_idx ON public.jobs(is_active);
CREATE INDEX IF NOT EXISTS jobs_created_at_idx ON public.jobs(created_at DESC);

-- Enable RLS (but allow all operations for now since we don't have auth yet)
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Create policies that allow all operations (no auth required for MVP)
CREATE POLICY "Allow all select on jobs" ON public.jobs FOR SELECT USING (true);
CREATE POLICY "Allow all insert on jobs" ON public.jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on jobs" ON public.jobs FOR UPDATE USING (true);
CREATE POLICY "Allow all delete on jobs" ON public.jobs FOR DELETE USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
