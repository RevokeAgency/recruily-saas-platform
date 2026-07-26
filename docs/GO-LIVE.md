# Revetly — Go-Live-Checkliste

Lebende Liste der Schritte, die beim Wechsel von **Test → Live** bzw. beim
Umzug der Domain erledigt werden müssen. Beim tatsächlichen Launch Punkt für
Punkt durchgehen.

---

## ⚠️ Domain-Wechsel Vercel → revetly.ai

Aktuell läuft alles unter der **Vercel-URL**. Wenn die Produktivdomain
`revetly.ai` scharf geschaltet wird, müssen folgende Stellen von der
Vercel-URL auf `https://revetly.ai` umgestellt werden:

- [ ] **Stripe-Webhook-Endpoint** (Stripe → Entwickler → Webhooks): URL auf
      `https://revetly.ai/api/stripe/webhook` ändern. Danach ggf. neues
      **Signing Secret** → `STRIPE_WEBHOOK_SECRET` in Vercel aktualisieren.
      *(Die Checkout-/Portal-Return-URLs im Code sind relativ zur Request-
      Origin — die passen sich automatisch an, sobald die App unter
      revetly.ai läuft. Nur der Webhook ist fest in Stripe hinterlegt.)*
- [ ] **Supabase Auth → URL Configuration**: Site URL + Redirect URLs auf
      `https://revetly.ai` (Confirm-/Reset-Mail-Links).
- [ ] **Supabase Auth E-Mail-Templates**: absolute Links prüfen.
- [ ] **EmailConnect / Inbound**: Inbound-Adressen/DNS auf die Live-Domain.
- [ ] **Resend**: Absenderdomain `revetly.ai` verifizieren (SPF/DKIM), damit
      Auto-Reply / Interview / Absage nicht im Spam landen.

---

## Stripe: Test → Live

- [ ] `STRIPE_SECRET_KEY` in Vercel auf den **Live-Key** (`sk_live_…`) tauschen.
- [ ] **Live-Webhook** neu anlegen (Test- und Live-Webhooks sind getrennt):
      `https://revetly.ai/api/stripe/webhook`, Events
      `checkout.session.completed`, `customer.subscription.updated`,
      `customer.subscription.deleted` → Live-`STRIPE_WEBHOOK_SECRET` in Vercel.
- [ ] Der **Produktkatalog legt sich beim ersten Live-Checkout selbst an**
      (idempotent via lookup_keys) — kein manuelles Anlegen nötig.
- [ ] **Stripe Tax** aktivieren (AT/EU-USt). Danach im Code
      `automatic_tax: { enabled: true }` in der Checkout-Session freischalten
      (`app/api/stripe/checkout/route.ts`) — bewusst noch aus, bis Tax steht.
- [ ] Stripe-Account: Firmendaten + Auszahlungskonto vollständig (Live-Pflicht).

---

## Datenbank-Migrationen (in Supabase ausführen, idempotent)

Reihenfolge egal, alle additiv:

- [ ] `scripts/015_rls_hardening.sql` — RLS owner-scoped (Sicherheits-Pflicht)
- [ ] `scripts/016_invited_at.sql` — Time-to-Interview-Messung
- [ ] `scripts/017_stripe_billing.sql` — Stripe-Billing-Spalten
- [ ] `scripts/018_fix_plan_limits_trigger.sql` — korrigiert den alten
      `on_plan_change`-Trigger, der `matches_limit` auf veraltete Werte klemmte

---

## Umgebungsvariablen (Vercel) — Soll-Zustand Live

- [ ] `STRIPE_SECRET_KEY` = `sk_live_…`
- [ ] `STRIPE_WEBHOOK_SECRET` = `whsec_…` (aus dem **Live**-Webhook)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
      `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `RESEND_API_KEY`
- [ ] `INBOUND_WEBHOOK_SECRET` (EmailConnect-Signatur)

---

## Smoke-Test nach Go-Live (Live-Mode, echte Karte / Test im Live sparsam)

- [ ] Registrierung → Onboarding → Dashboard
- [ ] Abo-Kauf (Abo-Seite) → Plan + Kontingent aktiv nach wenigen Sekunden
- [ ] „Abo verwalten" → Stripe-Portal öffnet, Planwechsel/Kündigung möglich
- [ ] Kontingent aufbrauchen → Paywall → Upgrade schaltet frei
- [ ] Public-Job-Page-Bewerbung + Inbound-E-Mail → Kandidat landet im Job
- [ ] DSGVO: Kandidat löschen entfernt auch Storage-Dateien
