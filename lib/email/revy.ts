import type { MailInput } from "@/lib/email/client"
import { MAIL, button, shell } from "@/lib/email/layout"
import { escapeHtml } from "@/lib/email/rejection"

// Einladung zum Gespräch aus Revy (Etappe 3). Gleiche Form wie die Absage:
// ein Brief im Revetly-Layout, Text aus fester Vorlage (lib/revy/vorlagen.ts),
// für HTML maskiert. Antworten gehen an die Person, die freigegeben hat.

export function buildInvitationMail(input: { to: string; subject: string; text: string; companyName: string; replyTo?: string | null }): MailInput {
  return {
    to: input.to,
    subject: input.subject,
    ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    html: shell(
      input.companyName,
      `<div style="white-space:pre-line;font-size:15px;line-height:1.7;color:${MAIL.text};">${escapeHtml(input.text)}</div>`,
      { preheader: input.subject },
    ),
  }
}

/**
 * Terminvorschlag aus Revy (Etappe 4): derselbe Brief, an der Stelle von
 * {{link}} ein Knopf zum Buchungslink. Der Link steht nur in dieser Mail.
 */
export function buildBookingProposalMail(input: {
  to: string
  subject: string
  text: string
  companyName: string
  bookingUrl: string
  replyTo?: string | null
}): MailInput {
  const [vor, ...rest] = input.text.split("{{link}}")
  const nach = rest.join("")
  const absatz = (t: string) => (t.trim() ? `<div style="white-space:pre-line;font-size:15px;line-height:1.7;color:${MAIL.text};">${escapeHtml(t.trim())}</div>` : "")
  const knopf = rest.length ? `${button(input.bookingUrl, "Termin auswählen", { variant: "dark" })}<p style="margin:0 0 18px;font-size:12px;line-height:1.5;color:${MAIL.text};word-break:break-all;">${escapeHtml(input.bookingUrl)}</p>` : ""
  return {
    to: input.to,
    subject: input.subject,
    ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    html: shell(input.companyName, `${absatz(vor)}${knopf}${absatz(nach)}`, { preheader: input.subject }),
  }
}
