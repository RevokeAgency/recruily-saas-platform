// Zentraler Mailversand.
//
// Anbieter: Lettermint (Europa). Löst Resend (USA) ab, damit auch der
// Mailkanal die EU nicht verlässt. Durch ihn laufen Bewerbernamen,
// Stellentitel, Terminvereinbarungen und ICS-Anhänge.
//
// Bewusst über fetch statt über das offizielle SDK. Zwei Gründe:
//
//  1. Es sind drei Felder und ein POST. Ein SDK dafür bringt einen
//     Abhängigkeitsbaum mit, den jemand pflegen muss.
//  2. Das Node-SDK hatte bis Version 1.5.1 einen Fehler
//     (GHSA-49pc-8936-wvfp): Bei Wiederverwendung einer Instanz wurden
//     Empfänger, Betreff, Inhalt und Anhänge zwischen zwei Sendungen nicht
//     zurückgesetzt. In einer Recruiting-Anwendung hieße das im schlimmsten
//     Fall, dass ein Bewerber den Lebenslauf eines anderen zugestellt bekommt.
//     Ein zustandsloser POST kann diesen Fehler nicht haben.
//
// Der Wechsel läuft schrittweise: Ist LETTERMINT_API_TOKEN gesetzt, geht alles
// über Lettermint. Fehlt der Token und RESEND_API_KEY ist noch da, greift der
// alte Weg. So bricht der Versand nicht ab, während die Domain bei Lettermint
// noch verifiziert wird.

export interface MailAttachment {
  filename: string
  /** Base64-kodierter Inhalt. */
  content: string
  contentType?: string
}

export interface MailInput {
  to: string
  subject: string
  html: string
  replyTo?: string
  attachments?: MailAttachment[]
}

const FROM = process.env.MAIL_FROM || "Revetly <karriere@revetly.ai>"
const LETTERMINT_URL = "https://api.lettermint.co/v1/send"

export function mailProvider(): "lettermint" | "resend" | null {
  if (process.env.LETTERMINT_API_TOKEN) return "lettermint"
  if (process.env.RESEND_API_KEY) return "resend"
  return null
}

async function sendViaLettermint(mail: MailInput): Promise<boolean> {
  const body: Record<string, unknown> = {
    from: FROM,
    // Lettermint erwartet Empfänger als Liste.
    to: [mail.to],
    subject: mail.subject,
    html: mail.html,
  }
  if (mail.replyTo) body.replyTo = mail.replyTo
  if (mail.attachments?.length) {
    body.attachments = mail.attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
      ...(a.contentType ? { contentType: a.contentType } : {}),
    }))
  }
  if (process.env.LETTERMINT_ROUTE) body.route = process.env.LETTERMINT_ROUTE

  const res = await fetch(LETTERMINT_URL, {
    method: "POST",
    headers: {
      "x-lettermint-token": process.env.LETTERMINT_API_TOKEN!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(`Lettermint ${res.status}: ${(await res.text()).slice(0, 300)}`)
  }
  return true
}

async function sendViaResend(mail: MailInput): Promise<boolean> {
  const { Resend } = await import("resend")
  const resend = new Resend(process.env.RESEND_API_KEY!)
  await resend.emails.send({
    from: FROM,
    to: mail.to,
    subject: mail.subject,
    html: mail.html,
    ...(mail.replyTo ? { replyTo: mail.replyTo } : {}),
    ...(mail.attachments?.length
      ? {
          attachments: mail.attachments.map((a) => ({
            filename: a.filename,
            content: a.content,
            contentType: a.contentType,
          })),
        }
      : {}),
  })
  return true
}

/**
 * Verschickt eine Mail. Best-effort: gibt false zurück statt zu werfen, damit
 * kein Fehler im Mailversand eine Bewerbung, eine Buchung oder eine Absage
 * blockiert. Der Grund landet im Log.
 */
export async function sendMail(mail: MailInput, label: string): Promise<boolean> {
  const provider = mailProvider()
  if (!provider) {
    console.warn(`[mail] ${label}: kein Anbieter konfiguriert, nichts gesendet`)
    return false
  }
  if (!mail.to?.trim()) return false

  try {
    return provider === "lettermint" ? await sendViaLettermint(mail) : await sendViaResend(mail)
  } catch (err) {
    console.error(`[mail] ${label} über ${provider} fehlgeschlagen:`, err)
    return false
  }
}

// ── Gemeinsame Bausteine der Mailvorlagen ───────────────────────────────────

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** Wickelt einen Textkörper (bereits escaptes HTML) in die Revetly-Hülle. */
export function shell(companyName: string, bodyHtml: string): string {
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
