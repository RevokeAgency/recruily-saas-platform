import { Resend } from "resend"

// Central outbound-email helper. Keeps the branded Revetly wrapper in one place
// so every transactional mail (auto-reply, rejection, invite) looks identical.
//
// NOTE: currently backed by Resend (US). The EU-conform provider swap is a
// separate roadmap item — only this file needs to change when we switch.

const FROM = "Revetly <karriere@revetly.ai>"

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

// Wraps a body (already-escaped HTML) in the shared Revetly shell.
function shell(companyName: string, bodyHtml: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="margin-bottom: 32px;">
        <span style="background: #16C77C; color: #0C1A16; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700;">
          ${escapeHtml(companyName)}
        </span>
      </div>
      <div style="color: #334155; line-height: 1.7; font-size: 15px;">
        ${bodyHtml}
      </div>
      <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 11px;">
        Powered by REVETLY — revetly.ai
      </div>
    </div>
  `
}

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
  if (!to || !process.env.RESEND_API_KEY) return false

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

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Eingangsbestätigung: Ihre Bewerbung als ${job}`,
      html: shell(company, body),
    })
    return true
  } catch (err) {
    console.error("[email] application-received send failed:", err)
    return false
  }
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
  if (!opts.to || !process.env.RESEND_API_KEY) return false

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

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: "Löschung deiner Bewerberdaten bestätigen",
      html: shell("Revetly", body),
    })
    return true
  } catch (err) {
    console.error("[email] deletion-confirmation send failed:", err)
    return false
  }
}
