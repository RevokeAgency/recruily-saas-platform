# Signup Defaults — Runbook (Bugfix)

Fixes two bugs you found while testing a fresh account:

- **New account had 10 matches** instead of the free plan's 5: the signup
  trigger in the live DB still used the pre-launch defaults.
- **No onboarding shown**: needs migration 009 (adds the `onboarded` column);
  without it the layout gate silently skips.

## Apply order

1. `scripts/009_onboarding.sql` (if not applied yet — adds `company_name` +
   `onboarded`)
2. `scripts/010_signup_defaults.sql`

Both are idempotent.

## What 010 does

- Recreates `handle_new_user()` so new signups get `plan = free`,
  `matches_limit = 5`, `active_jobs_limit = 1`, `onboarded = false`.
- Rebinds the `on_auth_user_created` trigger.
- Repairs existing rows whose limits don't match their plan (your test
  account drops from 10 to 5 matches). Enterprise rows are untouched.
- Sets matching column defaults.

## Test

1. Register a brand-new account (fresh email).
2. After the email confirmation you should land on `/onboarding`.
3. The dashboard should show **0 / 5 Matches** and a 1-job limit.
4. Your earlier test account: matches drop to 5; it will only see onboarding
   if it has no job and no company name (009 backfills those to
   `onboarded = true`, which is intended for existing users).
