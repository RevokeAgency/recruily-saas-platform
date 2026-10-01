import { buildAccountExport, adminClient } from "@/lib/account/data"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const maxDuration = 120

/**
 * Datenexport (DSGVO Art. 20): alle Daten des Kontos als eine JSON-Datei.
 * Inhalt und Ausschlüsse siehe buildAccountExport in lib/account/data.ts.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

    const db = adminClient()
    if (!db) return Response.json({ error: "Export ist gerade nicht verfügbar" }, { status: 503 })

    const now = new Date()
    const body = await buildAccountExport(db, user, now)
    return new Response(JSON.stringify(body, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="revetly-datenexport-${now.toISOString().slice(0, 10)}.json"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("[account/export] error:", error)
    return Response.json({ error: "Export fehlgeschlagen" }, { status: 500 })
  }
}
