import { createHmac, timingSafeEqual } from "node:crypto"

// Signaturprüfung für Lettermint-Webhooks, nach der Lettermint-Doku
// (lettermint.co/docs/platform/webhooks/signing, gelesen 22.11.2026):
//   Header X-Lettermint-Signature: "t={timestamp},v1={hmac_hex}"
//   HMAC-SHA256 mit dem Secret (whsec_..., unverändert) über "{t}.{Rohtext}"
//   Höchstens 300 Sekunden Abweichung; X-Lettermint-Delivery muss t sein.

export const TOLERANCE_SECONDS = 300

export function signLettermint(secret: string, t: number, rawBody: string): string {
  return createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex")
}

export function verifyLettermintSignature(input: {
  secret: string
  rawBody: string
  signature: string | null
  deliveryHeader?: string | null
  nowSeconds?: number
}): boolean {
  if (!input.signature) return false
  const parts = Object.fromEntries(
    input.signature.split(",").map((p) => {
      const i = p.indexOf("=")
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()]
    }),
  )
  const t = Number(parts.t)
  const v1 = parts.v1
  if (!Number.isFinite(t) || !v1 || !/^[0-9a-f]+$/i.test(v1)) return false
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000)
  if (Math.abs(now - t) > TOLERANCE_SECONDS) return false
  if (input.deliveryHeader != null && input.deliveryHeader !== "" && Number(input.deliveryHeader) !== t) return false
  const expected = Buffer.from(signLettermint(input.secret, t, input.rawBody), "hex")
  const given = Buffer.from(v1, "hex")
  return expected.length === given.length && timingSafeEqual(expected, given)
}
