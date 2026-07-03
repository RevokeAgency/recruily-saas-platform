# Email Inbound System — Runbook (Phase 1, Prompt 2)

Applications flow in by email, get parsed + scored automatically, and land in the
right job — the recruiter does nothing. Built provider-agnostic and fully
testable with simulated JSON; the real MX/provider hookup is a later plug-in step.

## 1. Apply the migration

Run `scripts/007_email_inbound_system.sql` (idempotent/additive) on the Supabase
DB. It adds `user_profiles.slug` (customer subdomain, backfilled + unique),
`slugify()`, and the `inbound_emails` table (RLS: a customer sees only their own;
service-role inserts).

## 2. Environment variables

- `SUPABASE_SERVICE_ROLE_KEY` — already used by public apply; the webhook needs it.
- `INBOUND_EMAIL_DOMAIN` — optional, default `revetly.ai`.
- `INBOUND_WEBHOOK_SECRET` — EmailConnect HMAC secret. **When set, the webhook
  verifies the `X-EmailConnect-Signature` (HMAC-SHA256) and rejects unsigned
  calls.** Leave unset only for local testing.

## 3. Provider decision (EmailConnect.eu) — please confirm before MX hookup

Verified: EmailConnect.eu is **EU-hosted** (Hetzner DE app + Scaleway FR storage,
no US parent), delivers inbound mail as JSON to a webhook, supports **catch-all**,
scans attachments with **ClamAV** (inline base64 or EU-S3 download URL), and signs
each webhook with **HMAC-SHA256**. Excellent fit for EU data sovereignty.

**Open question (flagged per the brief):** the spec addresses put the customer in
a **subdomain** (`…@kundenslug.revetly.ai`). Catch-all is confirmed *per domain*;
whether EmailConnect accepts **arbitrary subdomains** (`*.revetly.ai`) without
registering each one is unconfirmed. If it does not, the equivalent EU-hosted
solution is **not a different provider** but a **single-domain address scheme**
(customer in the local part, e.g. `kundenslug.senior-developer+<jobId>@revetly.ai`)
+ one catch-all. The routing already parses **both schemes**, so this is a config
choice made at hookup — no code change.

## 4. The "last step is just plugging in"

1. Point MX for `revetly.ai` (or `*.revetly.ai`) at EmailConnect.
2. Create a catch-all alias whose webhook = `https://<app>/api/inbound/email`.
3. Set `INBOUND_WEBHOOK_SECRET` to the alias secret.
That's it — the pipeline below is already built.

## 5. Pipeline (all provider-agnostic, RLS-safe)

`/api/inbound/email` → adapt payload (`lib/email/emailconnect.ts`) → parse
recipient (`lib/email/routing.ts`, routes on the **job UUID**, cross-checks the
customer slug) → pick a clean CV attachment → `parseCvBuffer` (PDF via Gemini,
DOCX via mammoth; cover letter = email body) → create candidate scoped to the
**resolved job owner** → `consumeMatch` → score, or store `queued` when over
limit. Every email is logged in `inbound_emails`; unresolved / no-CV / error
cases surface in **/inbox** ("Nicht zugeordnet") where the recruiter assigns them
to a job (`assignInboundEmail`).

Security: the owner is always taken from the resolved job (never from the
untrusted address alone); a mismatched slug/job → unassigned, never cross-filed.

## 6. Test without a live domain

Use `scripts/007_sample_inbound_webhook.json`. Replace the placeholders:
- `REPLACE_WITH_REAL_JOB_UUID` → an existing active job's id,
- `REPLACE_WITH_CUSTOMER_SLUG` → that job owner's `user_profiles.slug`,
- `REPLACE_WITH_BASE64_OF_A_REAL_CV_PDF_OR_DOCX` → `base64 -w0 cv.pdf`.

```bash
# Full happy path (INBOUND_WEBHOOK_SECRET must be unset locally):
curl -X POST http://localhost:3000/api/inbound/email \
  -H "Content-Type: application/json" \
  --data @scripts/007_sample_inbound_webhook.json
# → { "status": "assigned", "scored": true } ; candidate appears in the job.
```

Edge cases to verify:
- **Unassigned:** use a random UUID in `to` → `{ "status": "unassigned" }`, shows in /inbox.
- **No CV:** remove the attachment → `{ "status": "no_cv" }`, shows in /inbox.
- **Over limit:** exhaust the customer's matches first → candidate created, `scored:false`, status `queued`.
- **Assign:** open /inbox, pick a job, "Zuweisen" → candidate created + scored.
- **Signature:** set `INBOUND_WEBHOOK_SECRET`, POST without a valid `X-EmailConnect-Signature` → 401.

## 7. Follow-ups (later)

- Confirm EmailConnect subdomain-wildcard vs. switch to single-domain scheme.
- OCR for scanned PDFs is already covered by Gemini; if a dedicated OCR is wanted
  later, add it in `parseCvBuffer` (single call site).
- Optional: unread badge on the /inbox nav item.
