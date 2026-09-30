import { sendMail } from "@/lib/email/client"
import { MAIL, shell } from "@/lib/email/layout"
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

  return sendMail(
    {
      to: input.to,
      subject: `Ihre Bewerbung als ${input.jobTitle} bei ${input.companyName}`,
      // Ohne Überschrift und Oberzeile: Eine Absage soll wie ein Brief wirken,
      // nicht wie eine Systemmeldung. Der Text bleibt, wie er geschrieben ist.
      html: shell(
        input.companyName,
        `<div style="white-space:pre-line;font-size:15px;line-height:1.7;color:${MAIL.text};">${escapeHtml(text)}</div>`,
        { preheader: `Rückmeldung zu Ihrer Bewerbung als ${input.jobTitle}` },
      ),
    },
    "Absage",
  )
}
