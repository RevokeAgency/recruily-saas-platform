# Activity source — Runbook

Adds `job_candidates.source` so the sidebar activity feed (bell icon) can show
where each application came from.

## Apply

Run `scripts/013_activity_source.sql` in the Supabase SQL editor (idempotent).
Adds a `source` column (default `manual`) with a `NOT VALID` check constraint
for the values `manual` / `public_page` / `email`.

The code sets it automatically:
- public job page apply -> `public_page`
- inbound email -> `email`
- everything else -> `manual` (default)

## What lights up after this

- **Help icon** (left, sidebar) -> `/help` FAQ page.
- **Bell icon** (right, sidebar) -> activity popover fed by `/api/activities`,
  showing the latest applications with source, job, relative time and match
  result. A red dot marks items newer than the last time the popover was
  opened (tracked in localStorage).

No migration is strictly required for the feed to work (source just defaults to
`manual` and shows "manuell hinzugefügt"), but applying 013 makes the
"über die Job-Page" / "per E-Mail" labels accurate.
