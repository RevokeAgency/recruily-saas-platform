# Match-Counter System — Runbook (Phase 1, Prompt 1)

Backend enforcement for AI-match quota, per-plan job limits, monthly reset,
"Basic vs Full" score gating, and over-limit queueing.

## 1. Apply the migration

Run `scripts/006_match_counter_system.sql` against the Supabase (Frankfurt) DB —
SQL Editor or CLI. It is **idempotent & additive** (safe to re-run):

- adds `user_profiles.matches_period_start` (monthly-reset anchor),
- allows `enterprise` in the plan CHECK, `queued` in the job_candidates status CHECK,
- adds `plan_match_limit()` / `plan_job_limit()` and **backfills existing rows'
  `matches_limit` / `active_jobs_limit` from their plan** (final pricing —
  Free now 5/1, Starter 50/3, Growth 300/10, Pro 1000/∞),
- adds the atomic `consume_match()` and read-only `match_usage()` functions.

> Note: the `scripts/*.sql` files were an early snapshot; the live DB already
> has `user_profiles`, `user_id` columns and user-scoped RLS. This migration
> only touches the pieces above.

## 2. Decisions taken

- **Reset = calendar month, lazy** (Europe/Berlin), enforced inside
  `consume_match()`. No cron; self-healing; manipulation-proof (there is no
  Stripe webhook yet, so `billing_period_end` is unreliable and Free has no
  renewal date at all).
- **Counting is atomic** via a row lock (`FOR UPDATE`) in `consume_match()` and
  lives on the customer, not the job → deleting/recreating jobs can't reset it.
- **Basic vs Full score:** the full 9-category IMLRS score is always computed;
  Free only *sees* the overall score (breakdown/prognosis/pitch gated in the
  detail modal). Reversible on upgrade — no second AI path.
- **Over limit:** inbound public applications are stored with status `queued`
  (never lost, not scored, not counted). Recruiter-initiated matches still get
  the 403 paywall. The dashboard fires `POST /api/matches/backfill` on load to
  re-score queued applications once quota frees up (reset/upgrade).

## 3. All match entry points now go through `consumeMatch` (lib/quota.ts)

- `POST /api/candidates/[id]/match` — after validation
- `POST /api/candidates` (upload + jobId) — via `checkAndIncrementMatch`
- `POST /api/public/apply` — owner quota; `queued` when exhausted
- `POST /api/match` — now auth + quota gated (was an open bypass)

## 4. Manual test checklist

1. Free user, `matches_limit=5`: score 5 candidates → 6th manual match returns
   403 `match_limit_reached` (paywall). Dashboard shows `5 / 5` and the sidebar
   warning at ≥80 %.
2. Public apply while at limit → candidate appears with "Kontingent aufgebraucht
   – Upgraden zum Scoren", status `queued`, counter unchanged.
3. Raise the user's `matches_limit` (simulating upgrade), open the dashboard →
   backfill re-scores the queued candidate(s) automatically.
4. Set `matches_period_start` to last month → dashboard shows `0 / limit` again
   (virtual reset) and the next match starts a fresh count.
5. Job limit: Free with 1 active job → creating a 2nd active job returns
   `job_limit_reached`. Closing a job frees the slot.
6. Concurrency: fire two matches at once at `used = limit-1` → only one succeeds
   (atomic).

## 5. Follow-ups (later prompts)

- Stripe webhook should set `plan` + `matches_limit`/`active_jobs_limit` (via
  `plan_*_limit()`), reset the counter on renewal if desired, and call
  `/api/matches/backfill` on upgrade.
- Email-inbound applications must route through the same `consumeMatch` gate.
