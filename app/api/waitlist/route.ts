import { consumeRateLimit, emailKey, requesterKey, tooManyRequests } from "@/lib/rate-limit"
import { normalizeEmail } from "@/lib/team/model"
import { requestSignup, waitlistDb } from "@/lib/waitlist/store"

export const dynamic = "force-dynamic"

// Eintragen auf die Warteliste, Schritt 1: Bestätigungslink verschicken.
// Die Antwort ist für jede gültige Adresse gleich, damit sich nicht ablesen
// lässt, wer schon auf der Liste steht.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>

  // Unsichtbares Feld. Menschen lassen es leer, einfache Bots füllen es aus.
  if (typeof body.website === "string" && body.website.trim()) return Response.json({ ok: true })

  const email = normalizeEmail(body.email)
  if (!email) return Response.json({ error: "Bitte gib eine gültige E-Mail-Adresse an." }, { status: 400 })

  const db = waitlistDb()
  if (!db) return Response.json({ error: "Die Warteliste ist gerade nicht erreichbar." }, { status: 503 })

  const perIp = await consumeRateLimit(db, "waitlist_ip", requesterKey(req), 5, 3600)
  if (!perIp.allowed) return tooManyRequests(perIp, "Zu viele Anfragen. Bitte versuche es später noch einmal.")
  // Pro Adresse höchstens drei Mails am Tag. Darüber kommt dieselbe Antwort, nur ohne Mail.
  const perEmail = await consumeRateLimit(db, "waitlist_email", emailKey(email), 3, 86400)
  if (!perEmail.allowed) return Response.json({ ok: true })

  const source = typeof body.source === "string" ? body.source.slice(0, 40) : null
  const result = await requestSignup(db, email, source)
  if (result === "failed") {
    return Response.json({ error: "Das hat nicht geklappt. Bitte versuche es später noch einmal." }, { status: 502 })
  }
  return Response.json({ ok: true })
}
