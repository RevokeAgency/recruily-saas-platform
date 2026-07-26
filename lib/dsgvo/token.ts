import { createHmac, timingSafeEqual } from "node:crypto"

/**
 * Stateless, signed tokens for the applicant self-service deletion flow — no DB
 * table needed. A token binds an email to an expiry and is HMAC-signed with a
 * server-only secret, so it can't be forged and can't be reused after it lapses.
 */

const TTL_MS = 48 * 60 * 60 * 1000 // 48h

function secret(): string {
  // Server-only secret; the service-role key is never exposed to the client.
  const s = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!s) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set")
  return s
}

function b64url(s: string): string {
  return Buffer.from(s, "utf8").toString("base64url")
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url")
}

export function signDeletionToken(email: string, now = Date.now()): string {
  const exp = now + TTL_MS
  const payload = `${b64url(email.trim().toLowerCase())}.${exp}`
  return `${payload}.${sign(payload)}`
}

export function verifyDeletionToken(token: string, now = Date.now()): string | null {
  const parts = token.split(".")
  if (parts.length !== 3) return null
  const [emailB64, expStr, sig] = parts
  const payload = `${emailB64}.${expStr}`

  const expected = sign(payload)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  const exp = Number(expStr)
  if (!Number.isFinite(exp) || exp < now) return null

  try {
    return Buffer.from(emailB64, "base64url").toString("utf8")
  } catch {
    return null
  }
}
