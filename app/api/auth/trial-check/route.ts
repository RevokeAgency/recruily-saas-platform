import { NextRequest } from "next/server"
import { createClient as createAdmin } from "@supabase/supabase-js"

import { FREEMAIL_MESSAGE, emailDomain, isFreemail } from "@/lib/auth/freemail-domains"
import { consumeRateLimit, requesterKey, tooManyRequests } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

const PAID_PLANS = new Set(["starter", "growth", "pro"])

/**
 * Vorprüfung vor der Registrierung: Bekommt diese Adresse die Probestelle?
 *
 * Das Formular ruft den Endpunkt vor signUp() auf, damit eine Freemail-Adresse
 * mit einer klaren Meldung abgewiesen wird, statt stillschweigend ein Konto
 * ohne Kontingent zu erzeugen.
 *
 * Die verbindliche Entscheidung fällt NICHT hier, sondern in der Datenbank
 * (claim_free_trial, ausgelöst durch die bestätigte E-Mail). signUp() ist mit
 * dem öffentlichen Anon-Key auch am Formular vorbei aufrufbar, und dieser
 * Endpunkt ist deshalb nur die freundliche Vorwarnung, die Datenbank die
 * Schranke. Diese Prüfung trägt nichts ein, sie liest nur.
 *
 * Wer mit ?plan= für einen bezahlten Plan kommt, darf auch eine Freemail-
 * Adresse verwenden: Er bekommt keine Probestelle, bezahlt aber ohnehin.
 */
export async function POST(req: NextRequest) {
  let body: { email?: unknown; plan?: unknown }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Ungültige Anfrage" }, { status: 400 })
  }

  const email = typeof body.email === "string" ? body.email : ""
  const plan = typeof body.plan === "string" ? body.plan : null
  const domain = emailDomain(email)
  if (!domain) {
    return Response.json({ error: "Bitte gib eine gültige E-Mail-Adresse ein." }, { status: 400 })
  }

  const wantsPaidPlan = plan !== null && PAID_PLANS.has(plan)

  if (isFreemail(email)) {
    if (wantsPaidPlan) return Response.json({ ok: true, trialAvailable: false })
    return Response.json({ error: FREEMAIL_MESSAGE, code: "freemail" }, { status: 422 })
  }

  const db = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // Die Antwort verrät, ob eine Firma Revetly schon testet. Das ist wenig,
  // aber ohne Bremse ließe sich damit eine Domainliste abklopfen.
  const grenze = await consumeRateLimit(db, "trial_check_ip", requesterKey(req), 20, 3600)
  if (!grenze.allowed) {
    return tooManyRequests(grenze, "Zu viele Versuche. Bitte versuche es später erneut.")
  }

  const { data, error } = await db
    .from("free_trial_domains")
    .select("domain")
    .eq("domain", domain)
    .maybeSingle()

  // Fehlt die Migration 028 noch, ist der Stand unbekannt. Dann nicht
  // blockieren: Die Datenbank entscheidet nach dem Einspielen ohnehin selbst.
  if (error) {
    console.error("[trial-check] Domainprüfung übersprungen:", error.message)
    return Response.json({ ok: true, trialAvailable: true })
  }

  if (data) {
    return Response.json({
      ok: true,
      trialAvailable: false,
      notice:
        "Für deine Firmendomain wurde die Probestelle bereits genutzt. Du kannst dein Konto trotzdem anlegen und danach einen Plan wählen.",
    })
  }

  return Response.json({ ok: true, trialAvailable: true })
}
