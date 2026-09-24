import { sendMail } from "@/lib/email/client"
import { MAX_REJECTION_TEXT, defaultRejectionText } from "@/lib/email/rejection-text"

// Absage-Mails an Bewerber. Genutzt von der Einzelabsage (/api/send-rejection)
// und vom Abschluss einer Stelle (/api/jobs/[id]/close), damit beide Wege
// denselben Text, dieselbe Form und denselben Schutz haben. Der Text selbst
// liegt in lib/email/rejection-text.ts.

/**
 * Text für HTML maskieren. Der Absagetext kann vom Kunden frei geschrieben
 * sein und landete früher ungefiltert im HTML der Mail. Damit ließ sich über
 * die Absenderdomain von Revetly beliebiges HTML verschicken, etwa ein
 * gefälschter Anmeldelink.
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export async function sendRejectionMail(input: {
  to: string
  candidateName: string
  jobTitle: string
  companyName: string
  text?: string | null
}): Promise<boolean> {
  const custom = input.text?.trim().slice(0, MAX_REJECTION_TEXT)
  const text = custom || defaultRejectionText(input.candidateName, input.jobTitle, input.companyName)
  const company = escapeHtml(input.companyName)

  return sendMail(
    {
      to: input.to,
      subject: `Ihre Bewerbung als ${input.jobTitle} bei ${input.companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="margin-bottom: 32px;">
            <span style="background: #0d9488; color: white; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600;">
              ${company}
            </span>
          </div>
          <div style="white-space: pre-line; color: #334155; line-height: 1.7; font-size: 15px;">
            ${escapeHtml(text)}
          </div>
          <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 11px;">
            Powered by REVETLY, revetly.ai
          </div>
        </div>
      `,
    },
    "Absage",
  )
}
