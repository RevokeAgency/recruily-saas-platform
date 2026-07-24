-- ============================================================================
-- 017 — Stripe billing fields
--
-- Adds the Stripe linkage to user_profiles. The webhook (service role) keeps
-- these in sync; plan limits continue to flow through plan_match_limit /
-- plan_job_limit (006) — the webhook sets `plan` plus the mirrored limit
-- columns in one update.
--
-- Idempotent — safe to run more than once.
-- ============================================================================

alter table public.user_profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists billing_interval text
    check (billing_interval in ('monthly', 'yearly')) default 'monthly',
  add column if not exists billing_period_end timestamptz;

create index if not exists idx_user_profiles_stripe_customer
  on public.user_profiles (stripe_customer_id);
