import { sendMail } from "./client"
import { MAIL, button, details, escapeHtml, eyebrow, heading, paragraph, shell } from "./layout"

// Transaktionsmails rund um die Bewerbung. Der Versand selbst liegt in
// ./client.ts (Lettermint, Europa) — hier stehen nur noch die Inhalte.

/**
 * Application-received confirmation ("Eingangsbestätigung") sent to the
 * applicant. Enthält den Hinweis auf die KI-gestützte Auswertung und die
 * menschliche Entscheidung (KI-Verordnung Art. 26 Abs. 11). Für Bewerbungen
 * per E-Mail ist das der einzige Ort, an dem sie ihn sehen. Best-effort: returns false and logs on any failure so it can never
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

  const received = new Date().toLocaleDateString("de-AT", { timeZone: "Europe/Vienna", day: "numeric", month: "long", year: "numeric" })
  const body = `
    ${eyebrow("Bewerbung eingegangen")}
    ${heading("Vielen Dank für Ihre Bewerbung")}
    ${paragraph(`${greeting} wir haben Ihre Unterlagen erhalten und bestätigen hiermit den Eingang.`)}
    ${details([
      ["Stelle", `<strong>${escapeHtml(job)}</strong>`],
      ...(company !== "Revetly" ? ([["Bei", escapeHtml(company)]] as Array<[string, string]>) : []),
      ["Eingang", escapeHtml(received)],
    ])}
    ${paragraph("Ihre Bewerbung wird nun geprüft. Sie hören von uns, sobald es einen nächsten Schritt gibt. Bitte antworten Sie nicht auf diese automatische Nachricht.")}
    ${paragraph(
      "Hinweis: Ihre Unterlagen werden mit Unterstützung von KI ausgewertet und nach ihrer Passung zur Stelle geordnet. Wen wir einladen und wen wir auswählen, entscheidet ein Mensch. Ihre Daten werden spätestens sechs Monate nach Abschluss des Verfahrens gelöscht.",
      { muted: true, small: true },
    )}
    <p style="margin:24px 0 0;color:${MAIL.text};">Freundliche Grüße<br><strong style="color:${MAIL.ink};">${escapeHtml(company)}</strong></p>
  `

  return sendMail(
    {
      to,
      subject: `Eingangsbestätigung: Ihre Bewerbung als ${job}`,
      html: shell(company, body, { preheader: `Ihre Unterlagen für ${job} sind angekommen.` }),
    },
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
    ${eyebrow("Datenschutz")}
    ${heading("Löschung deiner Daten bestätigen")}
    ${paragraph("Du hast die Löschung deiner Bewerberdaten angefragt. Bestätige sie über den folgenden Knopf. Der Link ist 48 Stunden gültig.")}
    ${button(opts.confirmUrl, "Löschung bestätigen", { variant: "dark" })}
    ${paragraph("Wenn du diese Anfrage nicht gestellt hast, ignoriere diese E-Mail einfach. Dann wird nichts gelöscht.", { muted: true, small: true, last: true })}
  `

  return sendMail(
    {
      to: opts.to,
      subject: "Löschung deiner Bewerberdaten bestätigen",
      html: shell("Revetly", body, { preheader: "Ein Klick, dann sind deine Bewerberdaten gelöscht. Der Link gilt 48 Stunden." }),
    },
    "Löschbestätigung",
  )
}
