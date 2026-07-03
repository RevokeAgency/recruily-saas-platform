/**
 * Provider-agnostic inbound-email shape. Every provider adapter (currently
 * EmailConnect.eu) maps its webhook JSON to this type, so the rest of the
 * pipeline never depends on a specific provider. Swapping/confirming the
 * provider = editing one adapter file.
 */

export interface InboundAttachment {
  filename: string | null
  mimeType: string | null
  size?: number | null
  /** Small attachments arrive inline (also used by test fixtures). */
  contentBase64?: string | null
  /** Larger attachments arrive as an EU-hosted download URL (Scaleway S3). */
  downloadUrl?: string | null
  /** ClamAV result from the provider: "clean" | "infected" | "unscanned". */
  virusScan?: string | null
}

export interface InboundEmail {
  from: string
  /** The address we route on (job container). */
  to: string
  recipients?: string[]
  subject: string | null
  text: string | null
  html: string | null
  attachments: InboundAttachment[]
  auth?: { spf?: string | null; dkim?: string | null; dmarc?: string | null }
}
