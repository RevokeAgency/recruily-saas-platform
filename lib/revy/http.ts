import { adminClient } from "@/lib/scheduling/store"
import { createClient } from "@/lib/supabase/server"
import { requireFeature } from "@/lib/quota"
import { consumeRateLimit, tooManyRequests } from "@/lib/rate-limit"
import { getWorkspace } from "@/lib/workspace"
import type { RevyContext } from "./agent"

/**
 * Gemeinsamer Einstieg der Revy-Routen: angemeldet, aktiver Platz im Team,
 * Plan ab Growth, Mengenbremse. Gibt entweder den Kontext oder eine fertige
 * Fehlerantwort zurück.
 */
export async function revyRequest(opts: { rateLimit?: boolean } = {}): Promise<{ ctx: RevyContext } | { error: Response }> {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return { error: Response.json({ error: "Nicht angemeldet" }, { status: 401 }) }
  const ws = await getWorkspace(db, user.id)
  if (!ws.active) return { error: Response.json({ error: "Dein Platz im Team ist gerade gesperrt." }, { status: 403 }) }
  const admin = adminClient()
  const locked = await requireFeature(admin, ws.ownerId, "revy", "Revy")
  if (locked) return { error: locked }
  if (opts.rateLimit) {
    const rl = await consumeRateLimit(admin, "revy", user.id, 20, 60)
    if (!rl.allowed) return { error: tooManyRequests(rl, "Zu viele Anfragen an Revy. Warte kurz.") }
  }
  return { ctx: { db, admin, ownerId: ws.ownerId, actorId: user.id } }
}
