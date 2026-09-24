# 028 · Probestelle im Free-Plan

Der Free-Plan wird von einem monatlich erneuerten Gratistarif zu einer
einmaligen Probestelle. **Nicht automatisch ausführen.** Im Supabase-SQL-Editor
einspielen, additiv und idempotent wie alle Migrationen davor.

Voraussetzungen: 006, 010, 015, 017, 018, 024. Die Spalten aus 017 und 024,
die hier gebraucht werden, legt 028 defensiv selbst an.

## Regeln

| | Probestelle (Free) | Bezahlte Pläne |
|---|---|---|
| Matches | 25, einmalig | laut Plan, jeden Monat neu |
| Stellen | 1 je angelegte, auch Entwürfe | laut Plan, nur aktive zählen |
| Löschen gibt Kontingent zurück | nein | nein |
| Anspruch | eine Probestelle pro Firmendomain | immer |

## Was die Migration tut

**Zähler.** `matches_lifetime` gibt es seit 024 und wird von `consume_match()`
atomar mitgeführt. Die Probestelle zählt dagegen, statt einen zweiten Zähler
danebenzustellen, der auseinanderlaufen könnte. Neu ist
`jobs_created_lifetime`, hochgezählt von einem `BEFORE INSERT`-Trigger auf
`jobs` und nie verringert.

**Anspruch.** `trial_eligible` auf `user_profiles`, Standard `false`. Vergeben
wird er ausschließlich durch `claim_free_trial()`, und zwar erst, wenn die
E-Mail bestätigt ist. Grund: Sonst könnte jemand mit einer fremden
Firmenadresse ein Konto anlegen, die Bestätigung nie abschließen und die
Probestelle der ganzen Domain verbrennen. Bei OAuth oder abgeschalteter
Bestätigung steht `email_confirmed_at` schon beim Anlegen, dann greift die
Prüfung sofort.

**Domains.** `free_trial_domains` hält fest, welche Firmendomain ihre
Probestelle hatte. `freemail_domains` spiegelt `lib/auth/freemail-domains.ts`.
Beide Tabellen haben RLS ohne Policies: nur `service_role` und
`SECURITY DEFINER`-Funktionen kommen heran. **Die Freemail-Liste immer an
beiden Stellen pflegen.** Der Datenbank-Spiegel ist die eigentliche Sperre,
weil `signUp()` mit dem öffentlichen Anon-Key auch am Formular vorbei
aufrufbar ist.

**Limits.** `plan_match_limit('free')` steht jetzt auf 25. Die beiden
Funktionen bleiben reine Nachschlagetabellen Plan → Zahl. Der Auftrag sah vor,
sie um den Gesamtzähler zu erweitern; das geht nicht, ohne sie zu zerbrechen:
Sie sind `IMMUTABLE`, speisen den Plan-Trigger und haben keinen Nutzerbezug.
Wo Free den Gesamtzähler statt des Monatszählers verwendet, steht deshalb in
`consume_match()`, `match_usage()` und dem neuen `job_quota()`.

**Anzeige.** Acht Stellen in der Oberfläche lesen `matches_used` und
`matches_limit` direkt aus der Tabelle. Statt alle acht umzubauen, hält der
Plan-Trigger die Spalten für Free in einem Zustand, der ohne Monatslogik
stimmt: `matches_limit` ist 25 bei Anspruch, sonst 0, und `matches_used` ist
der Gesamtverbrauch, gedeckelt auf das Limit. Der Trigger feuert jetzt auch
auf `trial_eligible`, damit es genügt, den Anspruch zu setzen.

**Planwechsel.** Von Free in einen bezahlten Plan beginnt eine frische
Monatsperiode (`matches_used = 0`). Sonst stünde der Kunde im ersten bezahlten
Monat mit dem Verbrauch aus der Probestelle da.

**Spaltenschutz.** Siehe eigener Abschnitt unten. Das ist der wichtigste Teil
dieser Migration.

## Bestandskonten

Konten, die vor dem ersten Lauf dieser Migration angelegt wurden, behalten
ihren Anspruch; sie haben sich unter den alten Bedingungen registriert. Der
Stichtag wird beim ersten Lauf in `migration_markers` festgehalten. Ein fester
Datumswert wäre falsch gewesen (die Migration läuft später als geschrieben),
`now()` allein beim zweiten Lauf zu großzügig.

Ihre Domains werden eingetragen, pro Domain gewinnt das älteste Konto. Hatte
ein Bestandskonto schon mehr als 25 Matches, ist seine Probestelle damit
aufgebraucht. Das ist gewollt.

`jobs_created_lifetime` wird aus dem heutigen Stellenbestand nachgezählt.
Gelöschte Stellen sind nicht mehr zu sehen; der Bestand ist die beste
Näherung.

## Spaltenschutz auf `user_profiles` (behebt ein bestehendes Loch)

Die Policy `user_profiles_update_own` aus 015 erlaubt jedem Konto, **jede**
Spalte seiner eigenen Zeile zu ändern, direkt aus dem Browser. Das war schon
vor 028 ein kostenloses Pro-Abo für jeden, der es weiß:

```js
supabase.from('user_profiles').update({ plan: 'pro' }).eq('id', meineId)
```

Der Plan-Trigger hat danach brav 1.000 Matches vergeben. Ebenso ließ sich
`stripe_customer_id` auf die Kennung eines fremden Kunden setzen, und das
Kundenportal hätte dessen Abrechnung geöffnet.

028 legt einen Trigger davor, der Änderungen an Plan, Kontingent, Zählern,
Anspruch und Stripe-Kennungen verweigert, wenn der Aufrufer als
`authenticated` oder `anon` kommt. `service_role` (Stripe-Sync, Checkout,
Cron) und `SECURITY DEFINER`-Funktionen laufen unter einer anderen Rolle und
sind nicht betroffen. Gegen den App-Code geprüft: Kein Pfad, der als Nutzer
schreibt, fasst eine dieser Spalten an.

## Nach dem Einspielen prüfen

1. Neues Konto mit Firmenadresse, E-Mail bestätigen: 25 Matches, 1 Stelle.
2. Zweites Konto derselben Domain, bestätigen: 0 / 0, das Dashboard schlägt
   die Planwahl vor.
3. Registrierung mit `@gmail.com` ohne `?plan=`: Formular weist ab.
4. Registrierung mit `@gmail.com` und `?plan=starter`: Konto entsteht, 0 / 0
   bis zum Checkout, danach 50 / 3.
5. Probestelle anlegen, löschen, neue anlegen: zweite Anlage wird abgewiesen.
6. Im Browser als angemeldeter Nutzer
   `update({ plan: 'pro' })` auf die eigene Zeile: muss mit
   `protected_profile_columns` scheitern.
7. Ein bestehendes bezahltes Konto: unverändert, Monatslogik greift wie bisher.

## Bekannte Grenzen

- Ändert jemand nach der Registrierung seine E-Mail-Adresse, wird der
  Anspruch nicht neu bewertet.
- Wer ein bezahltes Abo kündigt, fällt auf Free zurück und hat dort in aller
  Regel kein Kontingent mehr, weil der Gesamtzähler die bezahlten Matches
  mitzählt. Das folgt aus „einmal pro Konto".
- Die Vorprüfung unter `/api/auth/trial-check` verrät, ob eine Firmendomain
  Revetly schon testet. Sie ist deshalb auf 20 Abfragen pro Stunde und
  Absender begrenzt.
