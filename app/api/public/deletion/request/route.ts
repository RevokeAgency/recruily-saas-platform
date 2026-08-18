import { NextRequest } from "next/server"
import { createClient as createAdmin } from "@supabase/supabase-js"
import { signDeletionToken } from "@/lib/dsgvo/token"
import { sendDeletionConfirmation } from "@/lib/email/send"
import { consumeRateLimit, emailKey, requesterKey, tooManyRequests } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

// Applicant self-service deletion — step 1: request. Sends a signed confirmation
// link (only when there actually is data for that address, to avoid emailing
// uninvolved people) and always responds generically so email existence can't
// be probed.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = String(body.email || "").trim().toLowerCase()
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return Response.json({ error: "Bitte gib eine gültige E-Mail-Adresse an." }, { status: 400 })
    }

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )

    // Missbrauchsschutz: Dieser Endpunkt verschickt Mail an eine frei
    // wählbare Adresse. Ohne Grenze ließe sich damit ein Postfach zumüllen.
    // Die Antwort bleibt in beiden Fällen unauffällig, damit sich über das
    // Verhalten nicht ablesen lässt, ob eine Adresse im System liegt.
    const absender = requesterKey(req)
    const proAbsender = await consumeRateLimit(admin, "deletion_ip", absender, 5, 3600)
    if (!proAbsender.allowed) {
      return tooManyRequests(proAbsender, "Zu viele Anfragen. Bitte versuche es später noch einmal.")
    }
    const proAdresse = await consumeRateLimit(admin, "deletion_email", emailKey(email), 3, 86400)
    if (!proAdresse.allowed) {
      // Kein 429: Das würde verraten, dass zu dieser Adresse schon Anfragen
      // liefen. Stattdessen die normale Antwort, nur ohne weitere Mail.
      return Response.json({ ok: true })
    }

    const { count } = await admin
      .from("candidates")
      .select("id", { count: "exact", head: true })
      .ilike("email", email)

    if ((count ?? 0) > 0) {
      const token = signDeletionToken(email)
      const origin = new URL(req.url).origin
      const confirmUrl = `${origin}/datenschutz/loeschung/bestaetigen?token=${encodeURIComponent(token)}`
      await sendDeletionConfirmation({ to: email, confirmUrl })
    }

    // Generic response either way (no enumeration).
    return Response.json({ ok: true })
  } catch (error) {
    console.error("[deletion request] error:", error)
    return Response.json({ error: "Anfrage fehlgeschlagen" }, { status: 500 })
  }
}
