import { NextRequest } from "next/server"

import { reviewDb } from "@/lib/review/store"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/** Freigabe-Link sofort ungültig machen. Die bisherigen Urteile bleiben. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

  const db = reviewDb()
  if (!db) return Response.json({ error: "Gerade nicht verfügbar." }, { status: 503 })

  const { data, error } = await db
    .from("review_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle()
  if (error) return Response.json({ error: "Widerrufen fehlgeschlagen." }, { status: 500 })
  if (!data) return Response.json({ error: "Link nicht gefunden oder schon widerrufen." }, { status: 404 })
  return Response.json({ revoked: true })
}
