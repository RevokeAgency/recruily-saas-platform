# Revetly — Go-Live-Checkliste

Lebende Liste der Schritte, die beim Wechsel von **Test → Live** bzw. beim
Umzug der Domain erledigt werden müssen. Beim tatsächlichen Launch Punkt für
Punkt durchgehen.

---

## 🚩 Blocker — ohne diese Punkte geht nichts live

Stand der Durchsicht: 19.09.2026.

- [ ] **Das Matching läuft in Produktion nicht.** `lib/ai/provider.ts:43` und
      `:49` setzen `reasoning` und `verification` per Default auf
      `mistral-large-latest`. Der aktuelle Mistral-Tarif antwortet darauf mit
      „This model is not available in your subscription tier", deshalb bleibt
      der Score leer und der Kandidat zeigt „Fehler". Zwei Wege: entweder
      `AI_MODEL_REASONING=mistral-small-latest` und
      `AI_MODEL_VERIFICATION=mistral-small-latest` in Vercel setzen, oder den
      Mistral-Tarif hochstufen. Danach `node scripts/eval/run-eval.mjs` gegen
      den Golden Set laufen lassen und prüfen, ob die erwarteten Score-Bänder
      mit dem kleineren Modell halten.
- [x] **Branch-Frage geklärt: `main` ist die Produktionslinie.** Vercel baut
      `main`, alles andere ist Nebengleis.

      `claude/design-handoff-audit-j3761y` ist **nicht** zu mergen. Der Branch
      ist ein alter Abzug des Projekts vom **3. Juli 2026** mit einem
      aufgesetzten Dashboard- und Auth-Redesign, ohne gemeinsamen Vorfahren
      mit `main`. Ein Merge würde **168 Dateien löschen**, darunter die
      komplette Stripe-Abrechnung, die Terminplanung samt Kalenderanbindung,
      den Mail-Eingang, die DSGVO-Selbstlöschung, den Blog, sämtliche
      Rechtstexte, das Fehler-Monitoring, die Matching-v2-Endpunkte und alle
      drei Cron-Jobs. Das wäre der Rückbau des halben Produkts.

      Eigenständig ist auf dem Branch fast nichts: zwei Dateien. Davon ist
      `app/api/public/upload-resume/route.ts` ein schwächerer Vorläufer der
      heutigen `app/api/public/apply/route.ts` (ohne Missbrauchsschutz und
      ohne Doppelbewerbungsprüfung), also eher Risiko als Gewinn.

      Sein Wert liegt rein im Optischen, einem Redesign über 72 Dateien. Auch
      das ist überholt: `main` hat dieselben Flächen seither selbst
      weiterentwickelt (Termine 07.08., Interview-Score 03.08.,
      Feedback-Loop 03.08.). Wenn die Optik gewünscht ist, gehört sie auf dem
      heutigen `main` neu gebaut, nicht zurückgemerged.
- [ ] **Rechtstexte enthalten Platzhalter** (siehe Abschnitt DSGVO weiter
      unten). Beim Impressum sind das Pflichtangaben nach ECG und UGB, das ist
      in AT und DE unmittelbar abmahnfähig.
- [ ] **Datenbank-Migrationen `015` bis `027`.** Welche davon in der
      Supabase-Instanz schon gelaufen sind, lässt sich nur dort nachsehen.
      `015_rls_hardening.sql` ist der wichtigste Einzelpunkt: ohne sie sind die
      Daten nicht owner-scoped abgesichert.

---

## ⚠️ Domain-Wechsel Vercel → revetly.ai

**Zuerst registrieren.** Am 19.09.2026 hatte weder `revetly.ai` noch
`.com`, `.at` oder `.de` Nameserver hinterlegt, was auf frei hindeutet, beim
Registrar aber gegenzuprüfen ist. Die Registrierung früh zu erledigen lohnt
sich aus einem Grund, der nichts mit der Website zu tun hat: Der Mailversand
hängt daran. SPF- und DKIM-Einträge müssen propagieren, und eine frische
Absenderdomain braucht Zustellreputation, bevor Auto-Reply, Absagen und
Terminmails zuverlässig im Posteingang statt im Spam landen. Das ist der
Punkt mit der längsten Vorlaufzeit im ganzen Launch.

Neben `.ai` auch die Abwehr-Registrierungen mitdenken (mindestens `.at`, da
Revetly e.U. ein österreichisches Unternehmen ist).

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
- [ ] **Lettermint**: Absenderdomain `revetly.ai` verifizieren (SPF/DKIM), damit
      Auto-Reply / Interview / Absage / Terminmails nicht im Spam landen.
- [ ] **`NEXT_PUBLIC_SITE_URL`** auf `https://revetly.ai` setzen. Daraus bauen
      sich `metadataBase`, die canonical-Links der Blog-Beiträge, `robots.txt`
      und `sitemap.xml`. Ohne die Variable greift der Default `revetly.ai`,
      solange die App aber noch unter der Vercel-URL läuft, zeigen die
      canonical-Links auf eine Domain, die es noch nicht gibt.
- [ ] **Sitemap in der Google Search Console einreichen**:
      `https://revetly.ai/sitemap.xml`.
- [ ] **OAuth-Weiterleitungs-URIs der Kalender-Apps** auf die Live-Domain
      umstellen (falls Kalenderanbindung genutzt wird):
      Google Cloud Console → `https://revetly.ai/api/calendar/callback/google`,
      Entra ID → `https://revetly.ai/api/calendar/callback/microsoft`. Sie
      werden aus `NEXT_PUBLIC_SITE_URL` gebildet und müssen beim Anbieter exakt
      übereinstimmen, sonst schlägt das Verbinden fehl.

---

## Stripe: Test → Live

- [ ] `STRIPE_SECRET_KEY` in Vercel auf den **Live-Key** (`sk_live_…`) tauschen.
- [ ] **Live-Webhook** neu anlegen (Test- und Live-Webhooks sind getrennt):
      `https://revetly.ai/api/stripe/webhook`, Events
      `checkout.session.completed`, `customer.subscription.updated`,
      `customer.subscription.deleted` → Live-`STRIPE_WEBHOOK_SECRET` in Vercel.
- [ ] Der **Produktkatalog legt sich beim ersten Live-Checkout selbst an**
      (idempotent via lookup_keys) — kein manuelles Anlegen nötig.
- [ ] **Stripe Tax** aktivieren (AT/EU-USt). Danach `automatic_tax: { enabled:
      true }` in der Checkout-Session ergänzen
      (`app/api/stripe/checkout/route.ts`). Achtung: Die Zeile steht dort
      aktuell **gar nicht**, auch nicht auskommentiert, sie muss also erst
      geschrieben werden. Ohne sie weist Stripe keine Umsatzsteuer aus.
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
- [ ] `scripts/025_scheduling.sql` — Terminplanung: Verfügbarkeitsprofil,
      Terminarten, Buchungen, persönliche Buchungslinks und verbundene
      Kalenderkonten. Einrichtung der OAuth-Apps siehe
      `scripts/025_scheduling.md`. Ohne diese Migration zeigt `/termine` einen
      Hinweis, der Rest der Anwendung läuft unverändert.
- [ ] `scripts/027_error_monitoring.sql` — Fehler-Monitoring: Tabellen
      `error_events` und `error_groups` plus `record_error()`,
      `mark_error_notified()` und `purge_error_events()`. Ohne diese Migration
      bleibt es beim bisherigen Verhalten (nur console.error), die Anwendung
      läuft unverändert.
- [ ] `scripts/026_rate_limits.sql` — Missbrauchsschutz für die öffentlichen
      Endpunkte: Tabelle `rate_limits` plus die Funktionen
      `consume_rate_limit()` und `purge_rate_limits()`. Ohne diese Migration
      zählt nichts und alle Zugriffe werden durchgelassen (bewusst
      fail-open), die Datei- und Doppelbewerbungsprüfungen greifen trotzdem.
- [ ] `scripts/028_free_trial_lifetime.sql`: **Probestelle statt Gratistarif
      und Spaltenschutz auf `user_profiles`.** Free wird zu einer einmaligen
      Probestelle (1 Stelle, 25 Matches, eine pro Firmendomain, Freemail
      ausgeschlossen). Schließt außerdem ein bestehendes Loch: Bis dahin kann
      sich jeder angemeldete Nutzer per `update({ plan: 'pro' })` aus dem
      Browser selbst auf Pro setzen. Gegen eine lokale Postgres-Instanz mit
      40 Prüfungen getestet, Details und Prüfliste in
      `scripts/028_free_trial_lifetime.md`.
- [ ] `scripts/024_product_feedback.sql` — Produktumfrage nach den ersten
      Matches: Lebenszeit-Zähler (`user_profiles.matches_lifetime`, wird von
      `consume_match()` mitgeführt), Zustand der Abfrage und die Tabelle
      `product_feedback`. Ohne diese Migration bleibt die Umfrage still aus,
      die Anwendung läuft unverändert weiter.

---

## Umgebungsvariablen (Vercel) — Soll-Zustand Live

- [ ] `STRIPE_SECRET_KEY` = `sk_live_…`
- [ ] `STRIPE_WEBHOOK_SECRET` = `whsec_…` (aus dem **Live**-Webhook)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
      `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `LETTERMINT_API_TOKEN` — **Mailversand.** Lettermint (Europa), löst Resend
      (USA) ab. Solange der Token fehlt und `RESEND_API_KEY` noch gesetzt ist,
      läuft der Versand weiter über Resend; das ist die Brücke für den Umstieg.
      Nach dem Wechsel `RESEND_API_KEY` entfernen.
- [ ] `MAIL_FROM` *(optional)* — Absender, Standard
      `Revetly <karriere@revetly.ai>`. Die Domain muss bei Lettermint
      verifiziert sein (SPF/DKIM), sonst wird abgelehnt.
- [ ] `LETTERMINT_ROUTE` *(optional)* — Route/Projekt bei Lettermint.
- [ ] `ERROR_NOTIFY_EMAIL` — Adresse für Fehlermeldungen. Sofort bei einer
      NEUEN Fehlerart, dazu ein Tagesbericht um 06:00 UTC. Ohne die Variable
      werden Fehler zwar gesammelt, aber niemand erfährt davon.
- [ ] `MONITORING_ADMIN_EMAIL` — kommagetrennte Liste der Konten, die
      `/api/monitoring/errors` sehen dürfen. Ohne die Variable ist der
      Endpunkt für alle gesperrt (fail-closed). Fehler sind Betriebsdaten und
      gehören nicht in die Kundenansicht.
- [ ] `RATE_LIMIT_SALT` — Pfeffer für die Pseudonymisierung der IP-Adressen im
      Missbrauchsschutz. Ohne ihn werden Adressen zwar gehasht, ließen sich aber
      mit dem IPv4-Raum durchprobieren. `openssl rand -hex 16`.
- [ ] `INBOUND_WEBHOOK_SECRET` (EmailConnect-Signatur)
- [ ] `FEEDBACK_NOTIFY_EMAIL` *(optional)* — Adresse, an die eine Kopie jeder
      Produkt-Rückmeldung geht. Ohne die Variable landet das Feedback nur in
      der Tabelle `product_feedback`.
- [ ] `SCHEDULING_TOKEN_KEY` — **Pflicht, sobald Kalender verbunden werden.**
      32 Byte, base64 (`openssl rand -base64 32`). Verschlüsselt die
      OAuth-Tokens der Kalenderkonten und signiert den OAuth-`state`. Ohne ihn
      speichert Revetly bewusst gar keine Zugänge (fail-closed). **Nicht
      tauschen**, sonst müssen alle Kunden ihren Kalender neu verbinden.
- [ ] `GOOGLE_CALENDAR_CLIENT_ID` / `GOOGLE_CALENDAR_CLIENT_SECRET`
      *(optional)* — Google-Workspace-Anbindung. Einrichtung siehe
      `scripts/025_scheduling.md`.
- [ ] `MICROSOFT_CALENDAR_CLIENT_ID` / `MICROSOFT_CALENDAR_CLIENT_SECRET` /
      `MICROSOFT_CALENDAR_TENANT` *(optional)* — Microsoft-365-Anbindung.
- [ ] `CRON_SECRET` — schützt die täglichen Cron-Jobs (`/api/cron/purge-candidates`
      um 03:00 und `/api/cron/calibrate-matching` um 04:00 UTC). Vercel sendet ihn
      als Bearer-Token an Cron-Aufrufe. In Vercel setzen; ohne ihn liefern die
      Endpoints 401 (fail-closed). Seit dem Fehler-Monitoring kommt
      `/api/cron/error-digest` um 06:00 UTC dazu.
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
- [ ] **AVV mit Lettermint abschließen** und in die Auftragsverarbeiter-Liste
      aufnehmen. Damit liegt auch der Mailkanal in der EU.
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

## Betrieb

- [ ] Fehler-Monitoring einmal auslösen und prüfen, dass die Mail ankommt:
      eine beliebige App-Seite mit fehlerhaftem Zustand aufrufen oder
      `/api/telemetry/error` mit `{"message":"Testfehler"}` anstoßen. Danach
      sollte die Gruppe unter `/api/monitoring/errors` stehen.
- [ ] Fehlermeldungen werden vor dem Speichern pseudonymisiert
      (`lib/training/anonymize.ts`). Vor dem Launch stichprobenartig eine
      Zeile aus `error_events` ansehen und bestätigen, dass keine
      Bewerberdaten darin stehen.

---

## Code und Qualität

Nichts davon hält den Launch auf, alles davon ist vorher billig zu erledigen.

- [ ] **`typescript: { ignoreBuildErrors: true }` in `next.config.mjs`
      abschalten.** `npx tsc --noEmit` läuft aktuell fehlerfrei durch, das Flag
      kostet also nichts und verhindert danach, dass ein Deploy mit kaputten
      Typen still durchgeht.
- [ ] **`pnpm lint` ist kaputt.** Es gibt keine `eslint.config.js`, und
      ESLint 10 liest die alte `.eslintrc`-Form nicht mehr. Aktuell prüft also
      nichts den Stil. Entweder eine Flat-Config anlegen oder das Skript aus
      `package.json` nehmen, damit es keine Sicherheit vortäuscht.
- [ ] **Verirrtes Verzeichnis `undefined/` im Repo-Root** entfernen.
- [ ] **Die vier Social-Links im Footer zeigen auf `href="#"`**
      (`components/landing/rv-footer.tsx:40`). Entweder echte Profile
      hinterlegen oder die Spalte bis dahin ausblenden. Tote Links im Footer
      sind das erste, was in einem SEO-Audit auffällt.
- [ ] **Toter TODO in `components/jobs/detail/candidates-tab.tsx:943`.** Der
      Status wird im Modal selbst bereits gespeichert, der Callback ruft aber
      kein `mutate()` auf. Folge: Nach einer Interview-Einladung zeigt die
      Kandidatenliste bis zum Reload den alten Stand.
- [ ] **Hero-Bild ist das LCP-Element** und liegt als einzelnes PNG auf der
      Supabase-Domain (`components/landing/rv-hero.tsx`). Sobald die Datei in
      `public/revetly/` liegt, lassen sich responsive Größen per `srcSet`
      nachrüsten. Der `preconnect` in `app/layout.tsx` ist gesetzt.

## Inhalt und SEO

- [x] **Metadaten und Footer auf die Tempo-Aussage nachgezogen**
      (`app/layout.tsx`, `components/landing/rv-footer.tsx`). Beide trugen noch
      die alte Formulierung „ohne alle zu lesen" und das Wort „bewerten", das
      laut Wording-System durch Match, Passung und Ranking ersetzt ist.
- [ ] **Blogbeiträge gegenlesen**, ob sie dieselbe Sprachregelung einhalten.
- [ ] Nach dem Domain-Wechsel: **Sitemap in der Google Search Console
      einreichen** und die Indexierung der Vercel-Vorschau-URL ausschließen.

---

## Smoke-Test nach Go-Live (Live-Mode, echte Karte / Test im Live sparsam)

- [ ] Registrierung → Onboarding → Dashboard
- [ ] Abo-Kauf (Abo-Seite) → Plan + Kontingent aktiv nach wenigen Sekunden
- [ ] „Abo verwalten" → Stripe-Portal öffnet, Planwechsel/Kündigung möglich
- [ ] Kontingent aufbrauchen → Paywall → Upgrade schaltet frei
- [ ] Public-Job-Page-Bewerbung + Inbound-E-Mail → Kandidat landet im Job
- [ ] DSGVO: Kandidat löschen entfernt auch Storage-Dateien
