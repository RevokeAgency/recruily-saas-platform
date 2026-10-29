# Supabase-Mailvorlagen im Revetly-Layout

Supabase verschickt einige Mails selbst (über Lettermint-SMTP). Damit sie wie
jede andere Revetly-Mail aussehen, stehen hier fertige Vorlagen. Erzeugt aus
`lib/email/supabase-auth.ts` mit demselben Layout wie alle anderen Mails.

## Einfügen

Supabase → Authentication → Emails → **Templates**. Für jede Vorlage den
Betreff übernehmen, den Inhalt der HTML-Datei komplett in das Feld
**Message body** kopieren (Ansicht „Source“), speichern.

| Vorlage in Supabase | Betreff | Datei |
| --- | --- | --- |
| Confirm signup | Bestätige deine E-Mail-Adresse für Revetly | `confirm-signup.html` |
| Invite user | Du bist zu Revetly eingeladen | `invite-user.html` |
| Magic Link | Dein Anmeldelink für Revetly | `magic-link.html` |
| Change Email Address | Bestätige deine neue E-Mail-Adresse | `change-email.html` |
| Reset Password | Setze dein Passwort für Revetly zurück | `reset-password.html` |
| Reauthentication | Dein Bestätigungscode für Revetly | `reauthentication.html` |

Die Platzhalter `{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .NewEmail }}`
und `{{ .Token }}` füllt Supabase beim Versand. Nicht verändern.

## Ändern

Texte in `lib/email/supabase-auth.ts` anpassen, dann neu erzeugen:

```
WRITE_SUPABASE_MAILS=1 pnpm vitest run tests/supabase-auth-mails.test.ts
```

und die geänderten Dateien erneut in Supabase einfügen. Der normale
Testlauf schlägt fehl, solange die Dateien nicht zum Code passen.
