// Freemail-Domains, für die es keine Probestelle gibt.
//
// Die Probestelle ist an die Firmendomain gebunden: eine pro Domain. Bei
// Freemail-Adressen wäre das wirkungslos, jeder könnte beliebig viele Konten
// mit neuen Adressen anlegen. Deshalb gilt für den kostenlosen Plan: nur mit
// Firmen-E-Mail. Mit einer Freemail-Adresse darf ein Konto trotzdem entstehen,
// es ist dann nur mit einem bezahlten Plan nutzbar.
//
// WICHTIG: Diese Liste hat einen Spiegel in der Datenbank, die Tabelle
// public.freemail_domains aus scripts/028_free_trial_lifetime.sql. Der
// Spiegel ist die eigentliche Sperre, weil signUp() auch am Formular vorbei
// mit dem öffentlichen Anon-Key aufrufbar ist. Diese Datei sorgt nur dafür,
// dass das Formular die Adresse gleich mit einer klaren Meldung abweist.
// Neue Einträge immer an beiden Stellen nachtragen.

export const FREEMAIL_DOMAINS: ReadonlySet<string> = new Set([
  "gmail.com", "googlemail.com",
  "gmx.at", "gmx.de", "gmx.net", "gmx.ch", "gmx.com", "gmx.eu", "gmx.org",
  "web.de", "email.de", "freenet.de", "arcor.de", "posteo.de", "posteo.net",
  "mailbox.org", "t-online.de", "online.de", "1und1.de",
  "yahoo.com", "yahoo.de", "yahoo.at", "ymail.com", "rocketmail.com",
  "outlook.com", "outlook.de", "outlook.at", "hotmail.com", "hotmail.de",
  "hotmail.at", "live.com", "live.de", "live.at", "msn.com",
  "icloud.com", "me.com", "mac.com",
  "aon.at", "chello.at", "a1.net", "kabsi.at", "liwest.at", "drei.at",
  "bluewin.ch", "hispeed.ch", "sunrise.ch",
  "proton.me", "protonmail.com", "protonmail.ch", "pm.me",
  "tutanota.com", "tutanota.de", "tuta.io",
  "mail.com", "aol.com", "aol.de", "zoho.com", "yandex.com", "yandex.ru", "mail.ru",
])

export const FREEMAIL_MESSAGE = "Für die Probestelle brauchst du eine Firmen-E-Mail-Adresse."

/** Domain einer E-Mail-Adresse, kleingeschrieben. null bei ungültiger Adresse. */
export function emailDomain(email: string): string | null {
  const at = email.trim().lastIndexOf("@")
  if (at < 1) return null
  const domain = email.trim().slice(at + 1).toLowerCase()
  return domain.includes(".") ? domain : null
}

export function isFreemail(email: string): boolean {
  const domain = emailDomain(email)
  return domain !== null && FREEMAIL_DOMAINS.has(domain)
}
