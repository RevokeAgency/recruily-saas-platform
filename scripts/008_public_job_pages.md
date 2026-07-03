# Public Job Pages — Runbook (Phase 1, Prompt 3)

Every job gets a clean, branded public page with an application form. Reuses the
Prompt-2 inbound pipeline (parse → create candidate → consumeMatch → score/queue).

## 1. Apply the migration

Run `scripts/008_public_job_pages.sql` (idempotent, needs 007). It adds
`jobs.public_slug` (unique per customer, backfilled + auto-assigned on insert via
trigger) and `user_profiles.logo_url`.

## 2. URLs & routing

- Public page: `revetly.ai/jobs/<customerSlug>/<jobSlug>` — server-resolved with
  the service role (user_profiles is RLS-protected). Route lives at
  `app/jobs/[id]/[jobSlug]` (the first segment is named `[id]` to match the
  existing `(app)/jobs/[id]` — Next.js requires one slug name per path position;
  it is read as the customer slug).
- Legacy `/apply/<jobId>` now 301-redirects to the clean URL.
- The "Kanäle & Bewerbungslink" modal shows the clean URL + the job email, both
  copyable.

## 3. Branding

Header shows the customer's logo (`user_profiles.logo_url`) or a company-initial
monogram fallback, plus the company name (`job.company`). Revetly appears only in
the small "Powered by Revetly" footer. `logo_url` is currently set via the DB /
Settings; a Storage-backed upload can be added later (bucket + `logo_url` update).

## 4. Close / reopen

`PATCH /api/jobs/[id]` `{ isActive }`. Closing frees the active-job slot; reopening
re-checks the plan's active-job limit (`job_limit_reached` when full). Closed jobs
show "Diese Stelle ist nicht mehr verfügbar" instead of the form and reject new
applications (`/api/public/apply` already requires `is_active`). Existing
candidates are always preserved. Toggle button: job detail header.

## 5. Match quota

Applications via the page go through `/api/public/apply` → owner quota. Over the
limit → candidate stored, confirmation shown, score deferred (`queued`), picked up
by the backfill on reset/upgrade — identical to email inbound.

## 6. Test

1. Create/open a job → "Kanäle" modal shows `…/jobs/<slug>/<jobSlug>`; open it.
2. Public page renders company branding + description + form; submit with a CV →
   candidate appears in the job (scored, or queued when over limit).
3. "Job schließen" on the detail page → public page shows the closed notice; a new
   job slot is free. "Job öffnen" restores it (blocked if at the limit).
4. Mobile viewport: layout stays single-column and legible.

## 7. Follow-ups

- Auto-reply email to the applicant (own prompt) — the success screen already
  promises it.
- Settings logo upload to Supabase Storage → set `user_profiles.logo_url`.
