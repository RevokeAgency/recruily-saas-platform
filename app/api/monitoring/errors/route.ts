import { NextRequest } from "next/server"
import { createClient as createServer } from "@/lib/supabase/server"
import { createClient as createAdmin } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

/**
 * Fehlerübersicht für den Betrieb.
 *
 * Bewusst nicht pro Kunde: Fehler sind Betriebsdaten, kein Produktmerkmal.
 * Ein Kunde soll nicht sehen, was in Revetly gerade klemmt, und schon gar
 * nicht Stacktraces, die Bruchstücke fremder Vorgänge enthalten können.
 *
 * Zugang über MONITORING_ADMIN_EMAIL (kommagetrennt). Ist die Variable nicht
 * gesetzt, ist der Endpunkt für alle gesperrt — fail-closed.
 */
function istBetreiber(email: string | null | undefined): boolean {
  const erlaubt = (process.env.MONITORING_ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  if (erlaubt.length === 0 || !email) return false
  return erlaubt.includes(email.trim().toLowerCase())
}

export async function GET(req: NextRequest) {
  const supabase = await createServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!istBetreiber(user?.email)) {
    return Response.json({ error: "Nicht berechtigt" }, { status: 403 })
  }

  const url = new URL(req.url)
  const fingerprint = url.searchParams.get("fingerprint")

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // Einzelne Gruppe: die letzten Vorkommen samt Stacktrace.
  if (fingerprint) {
    const [gruppe, vorkommen] = await Promise.all([
      admin.from("error_groups").select("*").eq("fingerprint", fingerprint).maybeSingle(),
      admin
        .from("error_events")
        .select("id, created_at, route, method, status, user_id, stack, context")
        .eq("fingerprint", fingerprint)
        .order("created_at", { ascending: false })
        .limit(10),
    ])
    if (gruppe.error) return Response.json({ error: "migration_fehlt" }, { status: 503 })
    return Response.json({ group: gruppe.data, events: vorkommen.data ?? [] })
  }

  const offen = url.searchParams.get("resolved") === "1"
  let query = admin
    .from("error_groups")
    .select("fingerprint, level, source, name, message, route, first_seen, last_seen, occurrences, resolved_at")
    .order("last_seen", { ascending: false })
    .limit(100)
  if (!offen) query = query.is("resolved_at", null)

  const { data, error } = await query
  if (error) return Response.json({ error: "migration_fehlt" }, { status: 503 })
  return Response.json({ groups: data ?? [] })
}

/** Fehler als erledigt markieren. Tritt er erneut auf, meldet er sich wieder. */
export async function PATCH(req: NextRequest) {
  const supabase = await createServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!istBetreiber(user?.email)) {
    return Response.json({ error: "Nicht berechtigt" }, { status: 403 })
  }

  const body = (await req.json().catch(() => ({}))) as { fingerprint?: string; resolved?: boolean }
  if (!body.fingerprint) return Response.json({ error: "Kein Fehler angegeben." }, { status: 400 })

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { error } = await admin
    .from("error_groups")
    .update({ resolved_at: body.resolved === false ? null : new Date().toISOString() })
    .eq("fingerprint", body.fingerprint)

  if (error) return Response.json({ error: "Konnte nicht gespeichert werden." }, { status: 500 })
  return Response.json({ ok: true })
}
