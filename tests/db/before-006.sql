-- In Produktion außerhalb der Skripte angelegt (frühe v0-Phase): Besitzer-
-- Spalte auf den Kerntabellen.
alter table public.jobs add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table public.candidates add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table public.job_candidates add column if not exists user_id uuid references auth.users (id) on delete cascade;
