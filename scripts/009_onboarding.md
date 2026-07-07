# Onboarding Flow — Runbook (Phase 1, Prompt 5)

A guided first-run setup: **company + slug + logo → done**. The first job is
created later in the dashboard (not during onboarding). Shows only once;
existing customers go straight to the dashboard.

> Note: the wizard was slimmed to 2 steps. The "first job" and "result"
> sections described further down reflect the original design and no longer
> run during onboarding — job creation, the application email and the public
> job-page link now live in the dashboard / job-channels modal.

## 1. Apply the migration

Run `scripts/009_onboarding.sql` (idempotent, needs 007 + 008). Adds
`user_profiles.company_name` and `onboarded` (default false). Existing customers
with a job / company are backfilled to `onboarded = true`, so only genuine new
signups see onboarding.

## 2. Create the Storage bucket for logos (one-time)

The logo upload writes to a **public** Storage bucket named `logos`:

Supabase → Storage → New bucket → name `logos`, **Public**. That's it. (If the
bucket is missing, logo upload just shows an error toast — onboarding continues,
logo is optional and can be added later in Settings.)

## 3. How it works

- **Gate:** `app/(app)/layout.tsx` redirects a signed-in user with
  `onboarded = false` to `/onboarding`. `/onboarding` redirects back to
  `/dashboard` once complete. Robust regardless of the auth path (email confirm →
  callback → app → gate).
- **Step 1 (Firma):** company name → auto slug (editable, uniqueness checked via
  `checkSlugAvailable`, suggestion on collision), optional logo upload
  (`POST /api/company/logo`). `saveCompany` sets `company_name` + a guaranteed
  unique `slug` (service-role check; own row only).
- **Step 2 (Erster Job):** streamlined form → `POST /api/jobs` (same endpoint as
  normal use; the DB trigger assigns `public_slug`). Skippable ("Später anlegen").
- **Step 3 (Ergebnis):** the job's application email + public job-page URL, copy
  buttons, and the call-to-action (paste the email into job boards / share the
  link).
- **Step 4 (Fertig):** `completeOnboarding()` sets `onboarded = true` → dashboard.
- **Later edits:** Settings → Profil now persists **company name**
  (`updateCompanyName`, keeps the slug so URLs/emails don't break) and **logo**
  (same upload route).

## 4. Test

1. New signup (or set a test user's `onboarded = false`, `company_name = null`,
   and delete their jobs) → logging in lands on `/onboarding`.
2. Enter a company whose slug is taken → a suggestion is offered.
3. Upload a logo (needs the `logos` bucket) → preview appears.
4. Create a job → step 3 shows the real email + `…/jobs/<slug>/<jobSlug>`.
5. "Zum Dashboard" → never see onboarding again; existing users never see it.
6. Settings → change company name / logo → persists.

## 5. Follow-ups

- The email-confirmation callback could redirect straight to `/onboarding` (the
  layout gate already covers it, so this is cosmetic).
- Branded auto-reply email uses `logo_url` (its own prompt).
