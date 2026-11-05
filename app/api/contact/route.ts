import { parseContactInput } from "@/lib/contact"
import { sendContactConfirmation, sendContactRequest, type ContactAccount } from "@/lib/email/contact"
import { mailProvider } from "@/lib/email/client"
import { consumeRateLimit, emailKey, requesterKey, tooManyRequests } from "@/lib/rate-limit"
import { createClient } from "@/lib/supabase/server"
import { waitlistDb } from "@/lib/waitlist/store"
import { getWorkspace } from "@/lib/workspace"

export const dynamic = "force-dynamic"

// Kontaktformular (/kontakt und Hilfeseite in der App). Die Nachricht geht
// per Mail an hallo@ oder support@, gespeichert wird sie nicht. Wer
// angemeldet ist, bekommt Konto und Plan automatisch angehängt.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>

  // Unsichtbares Feld wie bei der Warteliste. Bots füllen es aus.
  const trap = body.rv_check
  if (typeof trap === "string" && trap.trim()) {
    console.warn("[contact] Bot-Feld ausgefüllt, keine Mail")
    return Response.json({ ok: true })
  }

  const parsed = parseContactInput(body)
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 })
  const input = parsed.value

  if (!mailProvider()) {
    return Response.json(
      { error: "Das Formular ist gerade nicht erreichbar. Schreib uns bitte direkt an hallo@revetly.ai." },
      { status: 503 },
    )
  }

  const db = waitlistDb()
  if (db) {
    const perIp = await consumeRateLimit(db, "contact_ip", requesterKey(req), 5, 3600)
    if (!perIp.allowed) return tooManyRequests(perIp, "Zu viele Nachrichten. Bitte versuche es später noch einmal.")
    // Pro Absenderadresse höchstens drei am Tag. Darüber dieselbe Antwort, ohne Mail.
    const perEmail = await consumeRateLimit(db, "contact_email", emailKey(input.email), 3, 86400)
    if (!perEmail.allowed) {
      console.warn("[contact] Tagesgrenze für diese Adresse erreicht, keine Mail")
      return Response.json({ ok: true })
    }
  }

  let account: ContactAccount | null = null
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { ownerId } = await getWorkspace(supabase, user.id)
      const { data: profile } = await supabase.from("user_profiles").select("plan").eq("id", ownerId).maybeSingle()
      account = { email: user.email ?? null, userId: user.id, plan: (profile?.plan as string | null) ?? null, workspaceOwnerId: ownerId }
    }
  } catch (err) {
    console.error("[contact] Konto nicht ermittelt:", err)
  }

  const sent = await sendContactRequest(input, account)
  if (!sent) {
    return Response.json(
      { error: "Die Nachricht konnte nicht verschickt werden. Schreib uns bitte direkt an hallo@revetly.ai." },
      { status: 502 },
    )
  }
  await sendContactConfirmation(input)
  return Response.json({ ok: true })
}
