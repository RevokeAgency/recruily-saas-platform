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
- [ ] `scripts/019_ko_criteria.sql` — KO-Kriterien pro Job (`jobs.ko_criteria`)
      + KO-Ergebnis pro Kandidat (`job_candidates.knockout`, `knockout_reasons`)
- [ ] `scripts/020_interview_guide.sql` — strukturierter Interviewleitfaden +
      Bewertung pro Kandidat (`job_candidates.interview_*`)
- [ ] `scripts/021_matching_v2.sql` — IMLRS 2.0: CV-Volltext + Karriere-Dossier
      pro Kandidat (`candidates.resume_text/dossier`), Begründungs-Trail pro
      Match (`job_candidates.match_detail/match_engine`). Richter + Prüfinstanz
      laufen über die zentrale Provider-Schicht (Standard: Mistral Large, EU).
      Bestehende Scores bleiben, bis pro Job „Neu bewerten" geklickt wird.
- [ ] `scripts/022_feedback_loop.sql` — Feedback-Loop + Bestenvergleich:
      Outcome (`job_candidates.hired_at`, Status „Eingestellt"), Ranking
      (`pool_rank`, `pool_rank_reason`) und Kalibrierung pro Kunde
      (`user_profiles.match_calibration`, `imlrs_weights`). Danach läuft der
      nächtliche Cron `/api/cron/calibrate-matching` (04:00 UTC).
- [ ] `scripts/023_ai_training_consent.sql` — Einwilligung (Opt-in) + Tabelle
      `ai_training_examples` für ein eigenes, feingetuntes Revetly-Modell.
      Enthält einen Trigger, der bei Widerruf die Trainingsdaten löscht.

---

## Umgebungsvariablen (Vercel) — Soll-Zustand Live

- [ ] `STRIPE_SECRET_KEY` = `sk_live_…`
- [ ] `STRIPE_WEBHOOK_SECRET` = `whsec_…` (aus dem **Live**-Webhook)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
      `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `RESEND_API_KEY`
- [ ] `INBOUND_WEBHOOK_SECRET` (EmailConnect-Signatur)
- [ ] `CRON_SECRET` — schützt die täglichen Cron-Jobs (`/api/cron/purge-candidates`
      um 03:00 und `/api/cron/calibrate-matching` um 04:00 UTC). Vercel sendet ihn
      als Bearer-Token an Cron-Aufrufe. In Vercel setzen; ohne ihn liefern die
      Endpoints 401 (fail-closed).
- [ ] `MISTRAL_API_KEY` — **Pflicht.** Standard-KI-Provider (Mistral AI,
      Frankreich). Ohne diesen Key läuft kein Matching.
- [ ] `AI_MODEL_REASONING` / `AI_MODEL_EXTRACTION` / `AI_MODEL_UTILITY` /
      `AI_MODEL_VERIFICATION` / `AI_MODEL_VISION` *(optional)* — übersteuern die
      Modellwahl je Aufgabe (Defaults: `mistral-large-latest`,
      `mistral-small-latest`, `mistral-small-latest`, `mistral-large-latest`,
      `pixtral-12b-2409`).
      **Laufzeit-Hebel:** Eine vollständige Bewertung dauert ~60 s (4 sequenzielle
      Modell-Aufrufe: Dossier → Skill-Deckung → Richter → Prüfinstanz). Beim
      erneuten Matchen desselben Kandidaten entfällt das Dossier (gecacht) →
      ~45 s. Wer schneller sein will, setzt `AI_MODEL_VERIFICATION` auf
      `mistral-small-latest` und prüft anschließend mit `/api/matching/eval`,
      ob die erwarteten Score-Bänder weiter halten.
- [ ] `AI_ALLOW_NON_EU_FALLBACK` *(optional, Default AUS)* — erlaubt bei einem
      Mistral-Ausfall den Rückfall auf Google/Gemini. **Bewusst deaktiviert
      lassen**: Nur so ist zugesichert, dass Bewerberdaten die EU nie verlassen.
      Wird er aktiviert, muss Google als Auftragsverarbeiter in der
      Datenschutzerklärung genannt werden.

## DSGVO

- [ ] **Rechtstexte juristisch prüfen lassen** und alle `[Platzhalter]`
      ausfüllen: `/datenschutz`, `/impressum` (Firmenbuchnr., UID, Anschrift,
      Behörde, WKO-Fachgruppe …) und `/agb` (Gerichtsstand). Firmenname steht
      fix als **Revetly e.U.** (österr. eingetragener Unternehmer).
- [ ] Aufbewahrungsfrist bestätigen: Auto-Löschung läuft nach **180 Tagen**
      (Konstante `RETENTION_DAYS` in `app/api/cron/purge-candidates/route.ts`).
- [ ] Self-Service-Löschung testen: `/datenschutz/loeschung` → Mail →
      Bestätigen → Datensatz + Storage weg.
- [ ] **AVV mit Mistral AI abschließen** (Data Processing Agreement) und in die
      Auftragsverarbeiter-Liste aufnehmen. Ebenso prüfen: eigener AVV mit den
      Kunden (Revetly ist bezüglich Bewerberdaten Auftragsverarbeiter).
- [ ] **Einwilligungstext zum Modelltraining juristisch prüfen lassen**
      (`components/settings/ai-training-consent.tsx`, Datenschutz §5, AGB §10).
      Bei inhaltlicher Änderung `CONSENT_VERSION` hochzählen — die Fassung wird
      pro Einwilligung gespeichert (Nachweispflicht Art. 7 Abs. 1 DSGVO).
- [ ] Vor dem ersten Fine-Tune: Export stichprobenartig auf Restdaten prüfen
      (`/api/training/export?task=judge&stats=1` und eine Zeile des JSONL
      manuell ansehen).

---

## Smoke-Test nach Go-Live (Live-Mode, echte Karte / Test im Live sparsam)

- [ ] Registrierung → Onboarding → Dashboard
- [ ] Abo-Kauf (Abo-Seite) → Plan + Kontingent aktiv nach wenigen Sekunden
- [ ] „Abo verwalten" → Stripe-Portal öffnet, Planwechsel/Kündigung möglich
- [ ] Kontingent aufbrauchen → Paywall → Upgrade schaltet frei
- [ ] Public-Job-Page-Bewerbung + Inbound-E-Mail → Kandidat landet im Job
- [ ] DSGVO: Kandidat löschen entfernt auch Storage-Dateien
