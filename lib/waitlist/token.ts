import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto"

// ─────────────────────────────────────────────────────────────────────────────
// Links der Warteliste.
//
// Bestätigen: 32 zufällige Bytes, gespeichert ist nur der SHA-256-Abdruck
// (wie bei Freigabe- und Einladungslinks). Gilt CONFIRM_TTL_MS.
//
// Austragen: id des Eintrags plus HMAC-Signatur. Braucht keine Spalte und
// bleibt in jeder Mail gültig, auch in der Mail zum Start, die später aus der
// Liste verschickt wird. Der Schlüssel ist serverseitig (WAITLIST_SECRET, sonst
// der Service-Role-Key). Wird er gewechselt, gelten alte Austragelinks nicht
// mehr. WAITLIST_SECRET deshalb einmal setzen und dann nicht mehr ändern.
// ─────────────────────────────────────────────────────────────────────────────

/** Stand des Einwilligungstexts. Bei jeder inhaltlichen Änderung hochzählen. */
export const WAITLIST_CONSENT_VERSION = "2026-10-29"

export const CONFIRM_TTL_MS = 7 * 24 * 60 * 60 * 1000

export function createConfirmToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url")
  return { token, hash: hashConfirmToken(token) }
}

export function hashConfirmToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export function plausibleConfirmToken(token: unknown): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token)
}

function secret(): string {
  const s = process.env.WAITLIST_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!s) throw new Error("WAITLIST_SECRET oder SUPABASE_SERVICE_ROLE_KEY fehlt")
  return s
}

function sign(id: string, key: string): string {
  return createHmac("sha256", key).update(`waitlist-unsubscribe:${id}`).digest("base64url")
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export function unsubscribeToken(id: string, key = secret()): string {
  return `${id}.${sign(id, key)}`
}

/** id des Eintrags, wenn die Signatur stimmt, sonst null. */
export function verifyUnsubscribeToken(token: unknown, key = secret()): string | null {
  if (typeof token !== "string" || token.length > 120) return null
  const [id, sig, ...rest] = token.split(".")
  if (rest.length || !id || !sig || !UUID.test(id)) return null
  const a = Buffer.from(sig)
  const b = Buffer.from(sign(id, key))
  return a.length === b.length && timingSafeEqual(a, b) ? id : null
}
