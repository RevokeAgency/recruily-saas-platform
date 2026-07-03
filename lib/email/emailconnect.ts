import { createHmac, timingSafeEqual } from "crypto"
import type { InboundEmail, InboundAttachment } from "./types"

/**
 * EmailConnect.eu adapter. EmailConnect is EU-hosted (Hetzner DE + Scaleway FR),
 * signs every webhook with HMAC-SHA256, scans attachments with ClamAV, and
 * delivers small attachments inline (base64) / large ones as EU-S3 download URLs.
 *
 * The exact JSON field names are mapped defensively (several likely spellings)
 * so confirming the real payload later is a one-file change.
 */

/** Verify the HMAC-SHA256 signature EmailConnect sends with each webhook. */
export function verifyEmailConnectSignature(
  rawBody: string,
  signature: string | null,
  secret: string | undefined,
): boolean {
  if (!secret) return false
  if (!signature) return false
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")
  // Accept "sha256=<hex>" or bare hex.
  const provided = signature.includes("=") ? signature.split("=").pop()! : signature
  const a = Buffer.from(expected)
  const b = Buffer.from(provided)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function pick<T = unknown>(obj: Record<string, unknown>, ...keys: string[]): T | undefined {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k] as T
  }
  return undefined
}

function firstAddress(v: unknown): string {
  if (!v) return ""
  if (typeof v === "string") return v.trim()
  if (Array.isArray(v)) return firstAddress(v[0])
  if (typeof v === "object") {
    const o = v as Record<string, unknown>
    return String(pick(o, "address", "email", "value") ?? "").trim()
  }
  return ""
}

export function parseEmailConnectPayload(raw: Record<string, unknown>): InboundEmail {
  // EmailConnect nests the message under `email`/`message` in some versions.
  const msg = (pick<Record<string, unknown>>(raw, "email", "message", "data") ?? raw) as Record<string, unknown>

  const toRaw = pick(msg, "to", "recipient", "recipients", "envelopeTo")
  const recipients = Array.isArray(toRaw)
    ? (toRaw as unknown[]).map(firstAddress).filter(Boolean)
    : [firstAddress(toRaw)].filter(Boolean)

  const body = (pick<Record<string, unknown>>(msg, "body", "content") ?? msg) as Record<string, unknown>
  const attachmentsRaw = (pick<unknown[]>(msg, "attachments", "files") ?? []) as Record<string, unknown>[]

  const attachments: InboundAttachment[] = (attachmentsRaw || []).map((a) => ({
    filename: (pick<string>(a, "filename", "name", "fileName") ?? null),
    mimeType: (pick<string>(a, "contentType", "mimeType", "mime_type", "type") ?? null),
    size: (pick<number>(a, "size", "length") ?? null),
    contentBase64: (pick<string>(a, "content", "contentBase64", "data", "base64") ?? null),
    downloadUrl: (pick<string>(a, "downloadUrl", "url", "download_url") ?? null),
    virusScan: (pick<string>(a, "virusScan", "virus_scan", "scan", "clamav") ?? null),
  }))

  const auth = (pick<Record<string, unknown>>(msg, "authentication", "auth", "verification") ?? {}) as Record<string, unknown>

  return {
    from: firstAddress(pick(msg, "from", "sender", "envelopeFrom")),
    to: recipients[0] ?? "",
    recipients,
    subject: (pick<string>(msg, "subject") ?? null),
    text: (pick<string>(body, "text", "plain", "textBody", "bodyText") ?? pick<string>(msg, "text") ?? null),
    html: (pick<string>(body, "html", "htmlBody", "bodyHtml") ?? pick<string>(msg, "html") ?? null),
    attachments,
    auth: {
      spf: (pick<string>(auth, "spf") ?? null),
      dkim: (pick<string>(auth, "dkim") ?? null),
      dmarc: (pick<string>(auth, "dmarc") ?? null),
    },
  }
}
