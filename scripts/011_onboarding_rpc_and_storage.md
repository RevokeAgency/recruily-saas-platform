# Onboarding without the service-role key — Runbook (Bugfix)

Fixes the two errors you hit in onboarding:

- **"Invalid API key" on "Weiter"** — `saveCompany` used the Supabase
  service-role key, which is missing/invalid in your environment.
- **"Upload fehlgeschlagen"** on the logo — same key, plus the `logos`
  Storage bucket wasn't set up.

Both operations are the signed-in user editing their own data, so they no
longer touch the master key at all. Slug uniqueness (which needs to see other
customers' rows) moved into SECURITY DEFINER functions; the logo upload now
runs under Storage RLS.

## Apply

Run **`scripts/011_onboarding_rpc_and_storage.sql`** in the Supabase SQL
editor. Requires 007 (slugify + slug) and 009 (company_name). Idempotent.

It creates:
- `company_slug_status(text)` and `save_company(text, text)` RPCs
  (granted to `authenticated`),
- a **public** `logos` Storage bucket + RLS policies (write only inside your
  own `{user_id}/` folder, public read).

You no longer need to create the `logos` bucket by hand (the note in the 009
runbook is superseded by this).

## Result

Onboarding now works with only `NEXT_PUBLIC_SUPABASE_URL` +
`NEXT_PUBLIC_SUPABASE_ANON_KEY`. Company save, slug check, and logo upload all
succeed without `SUPABASE_SERVICE_ROLE_KEY`.

## Still need the service-role key elsewhere

The service-role key is still required for the **public, unauthenticated**
paths that must bypass RLS:

- `POST /api/public/apply` (public application form)
- `POST /api/public/upload-resume`
- `POST /api/inbound/email` (EmailConnect webhook)

If you want those to work, set `SUPABASE_SERVICE_ROLE_KEY` in your deployment
env (Supabase → Project Settings → API → `service_role` secret). Onboarding is
no longer blocked on it either way.

## Test

1. Fresh signup → land on `/onboarding`.
2. Enter a company name → slug shows "verfügbar".
3. Upload a PNG/JPG/SVG logo (≤ 2 MB) → preview appears, no error toast.
4. "Weiter" → no "Invalid API key"; step 2 opens.
