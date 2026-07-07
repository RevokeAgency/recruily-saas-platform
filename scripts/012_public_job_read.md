# Public job page 404 — Runbook (Bugfix)

Opening a public job link (`/jobs/<company>/<job>`) returned **404 Page not
found**. The page resolved the customer + job with the Supabase service-role
key, which isn't set in the deployment, so the lookup failed and Next.js
rendered `notFound()`.

A shared job link must render regardless of server secrets, so the lookup now
goes through a SECURITY DEFINER RPC callable with the anon key.

## Apply

Run **`scripts/012_public_job_read.sql`** in the Supabase SQL editor (requires
007 + 008, idempotent). It creates `public_job_by_slug(customer_slug, job_slug)`
granted to `anon`, returning only the public fields of the one matched job.

After deploying this commit + running the migration, the "Öffnen" button and
any shared link resolve correctly, even without `SUPABASE_SERVICE_ROLE_KEY`.

## Test

1. Create a job, open the "Dein Job ist bereit!" modal, click **Öffnen**.
2. The public page renders (no 404), branded, with the structured description.
3. A closed job still resolves and shows the "nicht mehr verfügbar" state.

## Heads-up: the submit / inbound side still needs the service-role key

Viewing the page now works without the key. But **receiving** applications is a
trusted, cross-tenant server write and still uses `SUPABASE_SERVICE_ROLE_KEY`:

- `POST /api/public/apply` (the application form on the public page),
- `POST /api/public/upload-resume`,
- `POST /api/inbound/email` (EmailConnect webhook).

For a production deployment set `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project
Settings → API → `service_role`) in the Vercel env. Without it the page loads
and shows the form, but submitting an application will error. (If you'd rather
not hold that key at all, these write paths can be moved onto SECURITY DEFINER
RPCs too — ask and I'll do it.)
