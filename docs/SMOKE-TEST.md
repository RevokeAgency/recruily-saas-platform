# Launch-Tag: Ablauf und Smoke-Test

Reihenfolge für den Tag, an dem die Coming-Soon-Seite abgeschaltet wird.
Alles im Browser, außer wo Vercel, Supabase, Stripe oder Lettermint steht.
Für Tests eine eigene Adresse nehmen, bei Gmail zum Beispiel
`name+test1@gmail.com`.

Offene Vorbedingungen stehen in `docs/GO-LIVE.md`. Bevor du hier startest,
sollten dort mindestens Impressum, Stripe Live und das Lettermint-Kontingent
erledigt sein.

---

## 1. Vorher (Coming-Soon-Seite ist noch aktiv)

- [ ] Vorschau öffnen: `https://www.revetly.ai/?vorschau=<LAUNCH_PREVIEW_TOKEN>`.
      Die Landing erscheint.
- [ ] `/admin/warteliste` → **Testmail an mich**. Die Mail „Revetly ist da“
      kommt an und sieht aus wie die übrigen Revetly-Mails.
- [ ] Lettermint: Kontingent reicht für alle bestätigten Adressen
      (Zahl auf `/admin/warteliste`) plus Puffer für den Tag.

## 2. Umschalten

- [ ] Vercel → Settings → Environment Variables: `NEXT_PUBLIC_LAUNCH_MODE`
      löschen.
- [ ] Deployments → oberstes Production-Deployment → ⋯ → Redeploy, ohne
      Build-Cache. Warten bis **Ready**.
- [ ] In einem privaten Fenster `https://www.revetly.ai` öffnen: Die Landing
      erscheint ohne Vorschau-Link, „Gratis testen“ führt zur Registrierung.
- [ ] `/?vorschau=aus` auf dem eigenen Gerät aufrufen, damit das alte
      Vorschau-Cookie weg ist.

## 3. Smoke-Test

**Öffentliche Seiten**
- [ ] Startseite, Blog, ein Blogbeitrag, Impressum, Datenschutz, AGB laden.
- [ ] Eine öffentliche Stellenseite (`/jobs/<firma>/<stelle>`) lädt und zeigt
      das Bewerbungsformular.

**Konto**
- [ ] Registrierung mit Testadresse → Bestätigungsmail im Revetly-Layout →
      Onboarding → Dashboard.
- [ ] Abmelden, „Passwort vergessen?“ → Mail kommt → neues Passwort → Anmeldung.

**Stelle und Bewerbung**
- [ ] Stelle anlegen und veröffentlichen.
- [ ] Über die öffentliche Stellenseite mit einer zweiten Testadresse
      bewerben (Lebenslauf als PDF). Eingangsbestätigung an die Bewerberin
      kommt an.
- [ ] Die Bewerbung erscheint im Dashboard **mit Score**. Kommt „Fehler“
      statt Score, ist das Matching in Produktion nicht erreichbar (siehe
      Blocker in `docs/GO-LIVE.md`).
- [ ] Bewerbung per Mail an die Bewerbungsadresse der Stelle schicken
      (Format `stelle@kunde.revetly.ai`): Kandidat landet in der Stelle.
- [ ] Bewerberfoto ist im Dashboard sichtbar. Dieselbe Bildadresse liefert in
      einem privaten Fenster ohne Anmeldung nichts.

**Gespräche und Mails an Bewerber**
- [ ] Kandidat → Interview-Einladung mit festem Termin: Mail kommt mit
      Firmenname oben, Kalendereintrag im Anhang lässt sich in Outlook oder
      Apple Kalender öffnen, Uhrzeit stimmt.
- [ ] Falls Kalender verbunden: Buchungslink schicken, Termin buchen,
      Bestätigung und Recruiter-Hinweis kommen an.
- [ ] Absage schreiben und senden: Mail kommt beim Bewerber an.
- [ ] Freigabe-Link an eine Fachabteilung schicken, Link öffnen, Rückmeldung
      geben, sie erscheint beim Recruiter.

**Team** *(nach Migration 035/036)*
- [ ] Einstellungen → Team → Einladung an eine Testadresse → annehmen →
      Mitglied sieht nur Team-Stellen, Inhaber sieht alles.

**Abo**
- [ ] Abo-Seite → Starter kaufen (echte Karte, danach erstatten) → Plan und
      Kontingent sind nach wenigen Sekunden aktiv.
- [ ] „Abo verwalten“ öffnet das Stripe-Portal, Planwechsel und Kündigung
      sind möglich.
- [ ] Stripe → Webhooks: Die letzten Ereignisse an
      `https://www.revetly.ai/api/stripe/webhook` sind grün.

**Datenschutz**
- [ ] `/datenschutz/loeschung` mit der Bewerber-Testadresse → Mail →
      Bestätigen → Bewerbung samt Lebenslauf ist weg.
- [ ] Einstellungen → Exportieren lädt eine JSON-Datei.
- [ ] Testkonto löschen: Abo in Stripe gekündigt, Anmeldung nicht mehr möglich.

**Betrieb**
- [ ] Vercel → Deployment → Functions: Region `fra1`.
- [ ] Vercel → Logs: keine roten Einträge aus dem Test außer erwarteten.
- [ ] Lettermint → All emails: alle Testmails zugestellt, keine Bounces.

## 4. Warteliste anschreiben

- [ ] `/admin/warteliste` → **An alle Bestätigten senden**. Läuft in Paketen
      zu 25, bis „noch 0 offen“ steht. Bricht er ab, Ursache im Vercel-Log
      unter `[mail]` prüfen und erneut starten.
- [ ] **Unbestätigte löschen.** Danach steht auf der Seite zweimal 0.

## 5. Danach

- [ ] Testkonten, Teststellen und Testbewerbungen löschen.
- [ ] Testkauf in Stripe erstatten.
- [ ] Google Search Console und Bing: Sitemap
      `https://www.revetly.ai/sitemap.xml` einreichen.
- [ ] Stellenseite im Google Rich Results Test prüfen (JobPosting ohne
      Fehler).
- [ ] Vercel: `LAUNCH_PREVIEW_TOKEN` löschen, wird nicht mehr gebraucht.
      `WAITLIST_SECRET` stehen lassen, solange noch Austragelinks im Umlauf sind.
