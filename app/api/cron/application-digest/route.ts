import { NextRequest } from "next/server"

import { sendApplicationDigests } from "@/lib/notifications/applications"

export const dynamic = "force-dynamic"
export const maxDuration = 300

/**
 * Tägliche Zusammenfassung neuer Bewerbungen an die Konten, die sie in den
 * Einstellungen eingeschaltet haben (lib/notifications/applications.ts).
 * Läuft morgens: 05:30 UTC ist 07:30 in Wien im Sommer, 06:30 im Winter.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }
  try {
    const result = await sendApplicationDigests()
    return Response.json({ ok: true, ...result })
  } catch (error) {
    console.error("[digest] error:", error)
    return Response.json({ error: "digest failed" }, { status: 500 })
  }
}
