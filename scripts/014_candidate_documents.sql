-- ============================================================================
-- 014 — Candidate documents + photo
--
-- Stores, per candidate: the CV file, an optional cover letter file, the
-- extracted cover-letter text (fed into matching), and an auto-cropped
-- profile photo for the avatar. Purely additive.
--
-- Also provisions the Storage buckets:
--   - resumes         (PRIVATE)  CV + cover letter files, served via signed URLs
--   - candidate-photos (PUBLIC)  cropped avatar images
--
-- Idempotent — safe to run more than once.
-- ============================================================================

alter table public.candidates add column if not exists resume_path       text;
alter table public.candidates add column if not exists cover_letter_path text;
alter table public.candidates add column if not exists cover_letter_text text;
alter table public.candidates add column if not exists photo_url         text;

-- Private bucket for CV / cover letter files (no public policies; access only
-- via service-role-generated signed URLs from the app).
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

-- Public bucket for the small cropped avatar images.
insert into storage.buckets (id, name, public)
values ('candidate-photos', 'candidate-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "candidate_photos_public_read" on storage.objects;
create policy "candidate_photos_public_read" on storage.objects
  for select
  using (bucket_id = 'candidate-photos');
