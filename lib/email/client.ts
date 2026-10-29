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

async function sendViaLettermint(mail: MailInput): Promise<string> {
  const body: Record<string, unknown> = {
    from: FROM,
    // Lettermint erwartet Empfänger als Liste.
    to: [mail.to],
    subject: mail.subject,
    html: mail.html,
  }
  // Feldnamen laut Lettermint-OpenAPI (Sending API 0.0.1): reply_to als
  // Liste, content_type in snake_case.
  if (mail.replyTo) body.reply_to = [mail.replyTo]
  if (mail.attachments?.length) {
    body.attachments = mail.attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
      ...(a.contentType ? { content_type: a.contentType } : {}),
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
  const data = (await res.json().catch(() => ({}))) as { message_id?: string; sandbox?: boolean }
  // Ein Projekt im Sandbox-Modus nimmt an, stellt aber nie zu.
  if (data.sandbox) console.warn("[mail] Lettermint-Projekt im Sandbox-Modus, Mail wird nicht zugestellt")
  return data.message_id ?? "ok"
}

async function sendViaResend(mail: MailInput): Promise<string> {
  const { Resend } = await import("resend")
  const resend = new Resend(process.env.RESEND_API_KEY!)
  // Das SDK wirft bei einer Ablehnung nicht, es liefert { error }. Ohne diese
  // Prüfung gälte eine abgelehnte Mail als verschickt.
  const { data, error } = await resend.emails.send({
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
  if (error) throw new Error(`Resend: ${error.message}`)
  return data?.id ?? "ok"
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
    const id = provider === "lettermint" ? await sendViaLettermint(mail) : await sendViaResend(mail)
    // Ohne Empfänger im Log (personenbezogen), nur was, wie und die Kennung beim Anbieter.
    console.info(`[mail] ${label} über ${provider} verschickt (${id})`)
    return true
  } catch (err) {
    console.error(`[mail] ${label} über ${provider} fehlgeschlagen:`, err)
    return false
  }
}

// ── Gemeinsame Bausteine der Mailvorlagen ───────────────────────────────────
// Liegen in ./layout.ts (Designsystem aller Mails). Hier weitergereicht, damit
// bestehende Importe aus ./client unverändert funktionieren.
export { escapeHtml, shell } from "./layout"
