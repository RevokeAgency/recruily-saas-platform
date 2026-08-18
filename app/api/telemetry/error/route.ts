import { NextRequest } from "next/server"
import { createClient as createAdmin } from "@supabase/supabase-js"

import { captureAndNotify } from "@/lib/monitoring/capture"
import { consumeRateLimit, requesterKey } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

/**
 * Nimmt Fehler aus dem Browser entgegen. Ohne Anmeldung erreichbar, weil
 * Fehler auch auf der Landing Page und der Buchungsseite auftreten.
 *
 * Deshalb streng begrenzt: Der Endpunkt schreibt in die Datenbank und kann
 * Mail auslösen, ist also dasselbe Ziel wie die anderen öffentlichen Routen.
 * Zusätzlich werden Meldung und Stacktrace hart gekürzt, damit niemand die
 * Tabelle als Ablage missbraucht.
 */
export async function POST(req: NextRequest) {
  try {
    const db = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )

    const grenze = await consumeRateLimit(db, "telemetry_ip", requesterKey(req), 20, 3600)
    // Bewusst 204 statt 429: Der Browser soll nicht erneut versuchen, und der
    // Nutzer merkt von alldem ohnehin nichts.
    if (!grenze.allowed) return new Response(null, { status: 204 })

    const body = (await req.json().catch(() => ({}))) as {
      name?: string
      message?: string
      stack?: string
      route?: string
    }

    const message = String(body.message ?? "").slice(0, 1000)
    if (!message) return new Response(null, { status: 204 })

    const fehler = new Error(message)
    fehler.name = String(body.name ?? "ClientError").slice(0, 100)
    fehler.stack = String(body.stack ?? "").slice(0, 4000)

    await captureAndNotify(fehler, {
      source: "client",
      route: String(body.route ?? "").slice(0, 300) || undefined,
    })

    return new Response(null, { status: 204 })
  } catch {
    // Ein Fehler beim Melden eines Fehlers bleibt folgenlos.
    return new Response(null, { status: 204 })
  }
}
