import { escapeHtml, sendMail, shell } from "./client"

// Transaktionsmails rund um die Bewerbung. Der Versand selbst liegt in
// ./client.ts (Lettermint, Europa) — hier stehen nur noch die Inhalte.

/**
 * Application-received confirmation ("Eingangsbestätigung") sent to the
 * applicant. Best-effort: returns false and logs on any failure so it can never
 * block the application pipeline. Skips silently when no key or no recipient.
 */
export async function sendApplicationReceived(opts: {
  to: string | null | undefined
  candidateName?: string | null
  jobTitle?: string | null
  companyName?: string | null
}): Promise<boolean> {
  const to = opts.to?.trim()
  if (!to) return false

  const company = (opts.companyName || "Revetly").trim()
  const job = (opts.jobTitle || "die ausgeschriebene Stelle").trim()
  const greetName = opts.candidateName?.trim()
  const greeting = greetName ? `Hallo ${escapeHtml(greetName)},` : "Hallo,"

  const body = `
    <p style="margin: 0 0 16px;">${greeting}</p>
    <p style="margin: 0 0 16px;">
      vielen Dank für Ihre Bewerbung als <strong>${escapeHtml(job)}</strong>${
        company !== "Revetly" ? ` bei <strong>${escapeHtml(company)}</strong>` : ""
      }. Wir haben Ihre Unterlagen erhalten und bestätigen hiermit den Eingang.
    </p>
    <p style="margin: 0 0 16px;">
      Ihre Bewerbung wird nun geprüft. Sie hören von uns, sobald es einen
      nächsten Schritt gibt. Bitte antworten Sie nicht auf diese automatische
      Nachricht.
    </p>
    <p style="margin: 24px 0 0;">Freundliche Grüße<br>${escapeHtml(company)}</p>
  `

  return sendMail(
    { to, subject: `Eingangsbestätigung: Ihre Bewerbung als ${job}`, html: shell(company, body) },
    "Eingangsbestätigung",
  )
}

/**
 * Notifies the Revetly team when a customer submits product feedback. Sent only
 * when FEEDBACK_NOTIFY_EMAIL is configured, so the feature works without it
 * (the entry is in the database either way). Best-effort, never blocks.
 */
export async function sendProductFeedbackNotice(opts: {
  customer: string
  company?: string | null
  plan?: string | null
  rating: number | null
  whatWorks?: string | null
  whatToImprove?: string | null
  featureWish?: string | null
}): Promise<boolean> {
  const to = process.env.FEEDBACK_NOTIFY_EMAIL?.trim()
  if (!to) return false

  const row = (label: string, value?: string | null) =>
    value
      ? `<p style="margin:0 0 14px;"><strong>${escapeHtml(label)}</strong><br>${escapeHtml(value).replace(/\n/g, "<br>")}</p>`
      : ""

  const stars = opts.rating ? `${opts.rating}/5` : "keine Angabe"
  const body = `
    <p style="margin: 0 0 16px;">
      <strong>${escapeHtml(opts.customer)}</strong>${
        opts.company ? ` (${escapeHtml(opts.company)})` : ""
      }${opts.plan ? ` · Plan: ${escapeHtml(opts.plan)}` : ""}
    </p>
    <p style="margin: 0 0 16px;">Bewertung: <strong>${escapeHtml(stars)}</strong></p>
    ${row("Was gut läuft", opts.whatWorks)}
    ${row("Was besser werden soll", opts.whatToImprove)}
    ${row("Feature-Wunsch", opts.featureWish)}
  `

  return sendMail(
    { to, subject: `Produkt-Feedback (${stars}) von ${opts.customer}`, html: shell("Revetly", body) },
    "Produkt-Feedback",
  )
}

/**
 * Double-opt-in confirmation for an applicant's self-service deletion request.
 * The link carries a signed, time-limited token; deletion only happens after the
 * applicant clicks and confirms. Best-effort.
 */
export async function sendDeletionConfirmation(opts: {
  to: string
  confirmUrl: string
}): Promise<boolean> {
  if (!opts.to) return false

  const body = `
    <p style="margin: 0 0 16px;">Hallo,</p>
    <p style="margin: 0 0 16px;">
      du hast die Löschung deiner Bewerberdaten angefragt. Bitte bestätige die
      Löschung über den folgenden Button. Der Link ist 48 Stunden gültig.
    </p>
    <p style="margin: 0 0 24px;">
      <a href="${opts.confirmUrl}" style="display:inline-block;background:#0C1A16;color:#fff;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:999px;font-size:14px;">
        Löschung bestätigen
      </a>
    </p>
    <p style="margin: 0 0 16px; color:#64707B; font-size:13px;">
      Wenn du diese Anfrage nicht gestellt hast, ignoriere diese E-Mail einfach —
      es wird nichts gelöscht.
    </p>
    <p style="margin: 24px 0 0;">Freundliche Grüße<br>Revetly</p>
  `

  return sendMail(
    { to: opts.to, subject: "Löschung deiner Bewerberdaten bestätigen", html: shell("Revetly", body) },
    "Löschbestätigung",
  )
}
