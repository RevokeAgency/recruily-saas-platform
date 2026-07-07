# Candidate documents + photo — Runbook

Adds CV / cover-letter storage + retrieval, cover-letter matching, and an
auto-extracted profile photo for the candidate avatar.

## Apply

Run `scripts/014_candidate_documents.sql` in the Supabase SQL editor
(idempotent). It:

- adds `candidates.resume_path`, `cover_letter_path`, `cover_letter_text`,
  `photo_url`,
- creates the **private** `resumes` bucket (CV + cover letter files),
- creates the **public** `candidate-photos` bucket (cropped avatars) with a
  public-read policy.

Requires `SUPABASE_SERVICE_ROLE_KEY` to be set (the public apply + inbound
routes and the signed-URL document route use it).

## How it works

- **Public application form** (`/api/public/apply`, now multipart): one call
  parses the CV + optional cover letter, creates the candidate, stores both
  files in `resumes/<owner>/<candidate>/`, best-effort extracts a profile photo
  from the CV PDF, and scores the candidate with the cover letter factored in.
  Applicants can upload two files or one combined multi-page PDF.
- **Inbound email**: stores the CV attachment, uses the email body as the cover
  letter, and extracts a photo the same way.
- **Photo extraction** (`lib/cv-photo.ts`): renders CV page 1 (pdfjs +
  @napi-rs/canvas), asks Gemini for the portrait bounding box, crops a square
  JPEG. Every step is guarded — on any failure the avatar falls back to
  initials. PDFs only.
- **Matching**: `cover_letter_text` is fed into the IMLRS prompt (soft skills,
  culture, motivation).
- **Profile**: the candidate avatar shows the photo when present; "Lebenslauf"
  and "Anschreiben" buttons open the document via a 5-minute signed URL
  (`/api/candidates/[id]/document`, owner-checked).

## Test

1. Apply on a public job page with a CV PDF that contains a portrait photo,
   plus a cover letter (separate file or combined PDF).
2. In the job's candidate list: the avatar shows the cropped photo, and
   "Lebenslauf" / "Anschreiben" buttons open the files.
3. The match score reflects the cover letter (soft skills / culture / motivation).
4. A CV without a photo just shows initials (no error).
