import { NextRequest } from "next/server"
import { adminClient } from "@/lib/scheduling/store"
import { processDue } from "@/lib/revy/versand"

export const dynamic = "force-dynamic"
export const maxDuration = 300

/**
 * Rückfall für den gestaffelten Versand von Revy: verschickt fällige Mails,
 * deren Lauf nach der Freigabe abgebrochen ist (Fenster geschlossen,
 * Zeitlimit). Täglich, weil Vercel Hobby nur tägliche Crons erlaubt; mit
 * Vercel Pro kann der Zeitplan in vercel.json enger werden.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }
  try {
    const result = await processDue(adminClient(), { deadline: Date.now() + 270_000 })
    return Response.json({ ok: true, ...result })
  } catch (error) {
    console.error("[revy-versand] error:", error)
    return Response.json({ error: "versand failed" }, { status: 500 })
  }
}
