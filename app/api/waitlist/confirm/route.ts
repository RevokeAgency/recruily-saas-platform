import { confirmSignup, waitlistDb } from "@/lib/waitlist/store"

export const dynamic = "force-dynamic"

// Eintragen, Schritt 2. Nur POST: Linkprüfer in Mailprogrammen rufen Links
// per GET auf und dürfen damit nichts bestätigen.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const db = waitlistDb()
  if (!db) return Response.json({ error: "Die Warteliste ist gerade nicht erreichbar." }, { status: 503 })
  const status = await confirmSignup(db, body.token)
  return Response.json({ status }, { status: status === "invalid" || status === "expired" ? 400 : 200 })
}
