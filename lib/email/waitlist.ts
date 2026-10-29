import { sendMail } from "./client"
import { button, escapeHtml, eyebrow, heading, paragraph, shell } from "./layout"

// ─────────────────────────────────────────────────────────────────────────────
// Mails der Warteliste: Bestätigung (Double-Opt-in), Begrüßung nach dem
// Bestätigen und ein kurzer Hinweis an uns.
// ─────────────────────────────────────────────────────────────────────────────

export async function sendWaitlistConfirm(opts: { to: string; confirmUrl: string }): Promise<boolean> {
  const body = `
    ${eyebrow("Warteliste")}
    ${heading("Bitte bestätige deine Adresse")}
    ${paragraph("Du möchtest auf die Warteliste von Revetly. Ein Klick auf den Knopf bestätigt, dass diese Adresse dir gehört. Erst dann stehst du auf der Liste.")}
    ${button(opts.confirmUrl, "Adresse bestätigen")}
    ${paragraph("Der Link gilt sieben Tage. Wenn du dich nicht eingetragen hast, ignoriere diese Mail einfach. Ohne Bestätigung löschen wir die Adresse wieder.", { muted: true, small: true, last: true })}
  `
  return sendMail(
    {
      to: opts.to,
      subject: "Bitte bestätige deinen Eintrag auf der Warteliste",
      html: shell("Revetly", body, { preheader: "Ein Klick, dann stehst du auf der Warteliste von Revetly." }),
    },
    "Warteliste Bestätigung",
  )
}

export async function sendWaitlistWelcome(opts: { to: string; unsubscribeUrl: string }): Promise<boolean> {
  const body = `
    ${eyebrow("Warteliste")}
    ${heading("Du stehst auf der Warteliste")}
    ${paragraph("Danke für dein Interesse an Revetly. Sobald du Revetly nutzen kannst, schreiben wir dir an diese Adresse. Andere Werbung schicken wir dir nicht.")}
    ${paragraph(`Du willst doch keine Nachricht? <a href="${escapeHtml(opts.unsubscribeUrl)}" style="color:inherit;">Hier austragen</a>. Dann löschen wir deine Adresse.`, { muted: true, small: true, last: true })}
  `
  return sendMail(
    {
      to: opts.to,
      subject: "Du stehst auf der Warteliste von Revetly",
      html: shell("Revetly", body, {
        preheader: "Wir melden uns, sobald du Revetly nutzen kannst.",
        footerNote: `Du bekommst diese Mail, weil du dich auf der Warteliste eingetragen hast. <a href="${escapeHtml(opts.unsubscribeUrl)}" style="color:inherit;">Austragen</a>`,
      }),
    },
    "Warteliste Begrüßung",
  )
}

/** Hinweis an WAITLIST_NOTIFY_EMAIL, wenn jemand bestätigt hat. Ohne Variable keine Mail. */
export async function notifyWaitlistSignup(email: string, total: number | null): Promise<void> {
  const to = process.env.WAITLIST_NOTIFY_EMAIL?.trim()
  if (!to) return
  const body = `
    ${eyebrow("Warteliste")}
    ${heading("Neuer Eintrag")}
    ${paragraph(`<strong>${escapeHtml(email)}</strong> hat die Adresse bestätigt.${total ? ` Bestätigte Einträge insgesamt: ${total}.` : ""}`, { last: true })}
  `
  await sendMail({ to, subject: `Warteliste: ${email}`, html: shell("Revetly", body) }, "Warteliste Hinweis")
}
