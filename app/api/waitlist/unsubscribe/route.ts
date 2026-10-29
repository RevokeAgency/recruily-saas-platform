import { unsubscribe, waitlistDb } from "@/lib/waitlist/store"

export const dynamic = "force-dynamic"

// Austragen. Nur POST, aus demselben Grund wie beim Bestätigen.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const db = waitlistDb()
  if (!db) return Response.json({ error: "Die Warteliste ist gerade nicht erreichbar." }, { status: 503 })
  const status = await unsubscribe(db, body.token)
  return Response.json({ status }, { status: status === "invalid" ? 400 : 200 })
}
