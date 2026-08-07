import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto"

// Zwei getrennte Aufgaben in einer Datei, weil beide denselben Zweck haben:
// Es soll niemand, der die Datenbank liest, damit etwas anfangen können.
//
//  1. OAuth-Tokens der Kalenderkonten werden verschlüsselt abgelegt
//     (AES-256-GCM). Ein Datenbankabzug enthält damit keine Zugänge zu den
//     Google- und Microsoft-Konten unserer Kunden.
//  2. Buchungslinks werden nur als SHA-256-Abdruck gespeichert. Aus der
//     Tabelle lässt sich kein gültiger Link rekonstruieren.

const ALGORITHM = "aes-256-gcm"

function key(): Buffer {
  const raw = process.env.SCHEDULING_TOKEN_KEY
  if (!raw) {
    throw new Error(
      "SCHEDULING_TOKEN_KEY fehlt. Ohne diesen Schlüssel werden keine " +
        "Kalender-Zugänge gespeichert (bewusst fail-closed).",
    )
  }
  const buf = Buffer.from(raw, "base64")
  if (buf.length !== 32) {
    throw new Error(
      "SCHEDULING_TOKEN_KEY muss 32 Byte lang sein (base64-kodiert). " +
        "Erzeugen mit: openssl rand -base64 32",
    )
  }
  return buf
}

/** Ist ein gültiger Schlüssel gesetzt? Für Diagnose und Statusanzeige. */
export function encryptionAvailable(): boolean {
  try {
    key()
    return true
  } catch {
    return false
  }
}

export function encryptToken(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key(), iv)
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  // Format: v1.<iv>.<tag>.<ciphertext>, alles base64url.
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), enc.toString("base64url")].join(".")
}

export function decryptToken(packed: string): string {
  const [version, ivB64, tagB64, dataB64] = packed.split(".")
  if (version !== "v1" || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("Unlesbares Token-Format")
  }
  const decipher = createDecipheriv(ALGORITHM, key(), Buffer.from(ivB64, "base64url"))
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"))
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final(),
  ]).toString("utf8")
}

/** Neuer Buchungslink: Klartext für die E-Mail, Abdruck für die Datenbank. */
export function createBookingToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url")
  return { token, hash: hashBookingToken(token) }
}

export function hashBookingToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

/**
 * Signierter Zustand für den OAuth-Umweg. Trägt die Nutzer-Kennung durch den
 * Anbieter hindurch und verhindert, dass ein untergeschobener Rückruf ein
 * fremdes Kalenderkonto an ein Revetly-Konto hängt.
 */
export function signOAuthState(payload: Record<string, string>): string {
  const body = Buffer.from(JSON.stringify({ ...payload, t: Date.now() })).toString("base64url")
  const mac = createHmac("sha256", process.env.SCHEDULING_TOKEN_KEY || "")
    .update(body)
    .digest("base64url")
  return `${body}.${mac}`
}

export function verifyOAuthState(state: string, maxAgeMs = 15 * 60 * 1000): Record<string, string> | null {
  const [body, mac] = state.split(".")
  if (!body || !mac) return null

  const expected = createHmac("sha256", process.env.SCHEDULING_TOKEN_KEY || "")
    .update(body)
    .digest("base64url")

  const a = Buffer.from(mac)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Record<string, string> & { t: number }
    if (Date.now() - Number(parsed.t) > maxAgeMs) return null
    return parsed
  } catch {
    return null
  }
}
