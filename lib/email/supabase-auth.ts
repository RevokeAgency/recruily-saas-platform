import { MAIL, button, escapeHtml, eyebrow, heading, paragraph, shell } from "./layout"
import { SITE_URL } from "@/lib/site"

// ─────────────────────────────────────────────────────────────────────────────
// Vorlagen für die Mails, die Supabase selbst verschickt (Passwort, Adresse
// bestätigen, Anmeldelink …). Sie laufen über Lettermint-SMTP, der Inhalt kommt
// aber aus dem Supabase-Dashboard. Damit sie wie jede andere Revetly-Mail
// aussehen, entstehen sie aus demselben Layout (layout.ts) und werden als
// fertiges HTML nach docs/supabase-mails/ geschrieben:
//
//   WRITE_SUPABASE_MAILS=1 pnpm vitest run tests/supabase-auth-mails.test.ts
//
// Danach Betreff und HTML in Supabase unter Authentication → Emails →
// Templates einfügen (Anleitung: docs/supabase-mails/README.md). Der Test schlägt fehl, wenn die Dateien nicht mehr zum
// Layout passen.
//
// Platzhalter wie {{ .ConfirmationURL }} füllt Supabase beim Versand.
// ─────────────────────────────────────────────────────────────────────────────

/** Hauptadresse für Logo und Links, unabhängig von der lokalen Umgebung. */
export const SUPABASE_MAIL_SITE = "https://www.revetly.ai"

export type SupabaseMail = {
  /** Dateiname und Name in Supabase. */
  file: string
  /** Bezeichnung der Vorlage im Supabase-Dashboard. */
  supabaseName: string
  subject: string
  html: string
}

/** Link als Text unter dem Knopf, falls ein Mailprogramm den Knopf nicht zeigt. */
function fallbackLink(url: string): string {
  return paragraph(
    `Funktioniert der Knopf nicht? Kopiere diesen Link in deinen Browser:<br><a href="${url}" style="color:${MAIL.greenDeep};word-break:break-all;">${url}</a>`,
    { muted: true, small: true },
  )
}

function ignoreNote(text: string): string {
  return paragraph(escapeHtml(text), { muted: true, small: true, last: true })
}

/** Großer Code zum Abtippen, z. B. bei der erneuten Anmeldung. */
function codeBox(code: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 18px;">
  <tr><td style="padding:16px 26px;background:${MAIL.mist};border:1px solid ${MAIL.line};border-radius:16px;font-family:${MAIL.font};font-size:30px;font-weight:800;letter-spacing:.24em;color:${MAIL.ink};">${code}</td></tr>
</table>`
}

function mail(file: string, supabaseName: string, subject: string, preheader: string, body: string): SupabaseMail {
  const html = shell("Revetly", body, { preheader }).split(SITE_URL).join(SUPABASE_MAIL_SITE)
  return { file, supabaseName, subject, html }
}

const LINK = "{{ .ConfirmationURL }}"

export function supabaseAuthMails(): SupabaseMail[] {
  return [
    mail(
      "confirm-signup.html",
      "Confirm signup",
      "Bestätige deine E-Mail-Adresse für Revetly",
      "Ein Klick, dann ist dein Revetly-Konto bereit.",
      `
    ${eyebrow("Willkommen")}
    ${heading("Bestätige deine E-Mail-Adresse")}
    ${paragraph("Schön, dass du da bist. Bestätige noch kurz, dass diese Adresse dir gehört. Danach kannst du direkt loslegen.")}
    ${button(LINK, "Adresse bestätigen")}
    ${fallbackLink(LINK)}
    ${ignoreNote("Du hast kein Konto bei Revetly angelegt? Dann ignoriere diese Mail einfach.")}
  `,
    ),
    mail(
      "invite-user.html",
      "Invite user",
      "Du bist zu Revetly eingeladen",
      "Nimm die Einladung an und leg dein Passwort fest.",
      `
    ${eyebrow("Einladung")}
    ${heading("Du bist zu Revetly eingeladen")}
    ${paragraph("Für dich wurde ein Zugang zu Revetly angelegt. Nimm die Einladung an und leg dein Passwort fest.")}
    ${button(LINK, "Einladung annehmen")}
    ${fallbackLink(LINK)}
    ${ignoreNote("Du kannst mit dieser Einladung nichts anfangen? Dann ignoriere diese Mail einfach.")}
  `,
    ),
    mail(
      "magic-link.html",
      "Magic Link",
      "Dein Anmeldelink für Revetly",
      "Mit einem Klick bist du angemeldet.",
      `
    ${eyebrow("Anmelden")}
    ${heading("Dein Anmeldelink")}
    ${paragraph("Mit dem Knopf meldest du dich bei Revetly an, ganz ohne Passwort.")}
    ${button(LINK, "Jetzt anmelden")}
    ${fallbackLink(LINK)}
    ${ignoreNote("Der Link gilt nur kurz und nur einmal. Du hast ihn nicht angefordert? Dann ignoriere diese Mail, dein Konto bleibt unverändert.")}
  `,
    ),
    mail(
      "change-email.html",
      "Change Email Address",
      "Bestätige deine neue E-Mail-Adresse",
      "Bestätige die neue Adresse für dein Revetly-Konto.",
      `
    ${eyebrow("Konto")}
    ${heading("Neue E-Mail-Adresse bestätigen")}
    ${paragraph("Du möchtest die Adresse deines Revetly-Kontos von <strong>{{ .Email }}</strong> auf <strong>{{ .NewEmail }}</strong> ändern. Bestätige die Änderung mit dem Knopf.")}
    ${button(LINK, "Änderung bestätigen")}
    ${fallbackLink(LINK)}
    ${ignoreNote("Du hast das nicht veranlasst? Dann ignoriere diese Mail und ändere zur Sicherheit dein Passwort.")}
  `,
    ),
    mail(
      "reset-password.html",
      "Reset Password",
      "Setze dein Passwort für Revetly zurück",
      "Leg mit einem Klick ein neues Passwort fest.",
      `
    ${eyebrow("Passwort")}
    ${heading("Neues Passwort festlegen")}
    ${paragraph("Für dein Revetly-Konto wurde ein neues Passwort angefordert. Mit dem Knopf legst du es fest.")}
    ${button(LINK, "Neues Passwort festlegen")}
    ${fallbackLink(LINK)}
    ${ignoreNote("Der Link gilt nur kurz und nur einmal. Du hast das nicht angefordert? Dann ignoriere diese Mail, dein Passwort bleibt unverändert.")}
  `,
    ),
    mail(
      "reauthentication.html",
      "Reauthentication",
      "Dein Bestätigungscode für Revetly",
      "Gib diesen Code in Revetly ein.",
      `
    ${eyebrow("Sicherheit")}
    ${heading("Dein Bestätigungscode")}
    ${paragraph("Gib diesen Code in Revetly ein, um die Aktion zu bestätigen.")}
    ${codeBox("{{ .Token }}")}
    ${ignoreNote("Der Code gilt nur kurz. Du hast ihn nicht angefordert? Dann ignoriere diese Mail und ändere zur Sicherheit dein Passwort.")}
  `,
    ),
  ]
}
