import type { MailInput } from "@/lib/email/client"
import { MAIL, shell } from "@/lib/email/layout"
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
