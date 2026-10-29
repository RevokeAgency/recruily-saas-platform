import { isOperator } from "@/lib/admin"
import { sendWaitlistLaunch } from "@/lib/email/waitlist"
import { isWaitlistMode } from "@/lib/launch"
import { createClient } from "@/lib/supabase/server"
import { purgePending, sendLaunchBatch, waitlistDb, waitlistStats } from "@/lib/waitlist/store"
import { unsubscribeToken } from "@/lib/waitlist/token"
import { absoluteUrl } from "@/lib/site"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// Warteliste für den Betrieb: Zahlen, Testmail, Versand zum Start, Aufräumen.
// Nur für MONITORING_ADMIN_EMAIL (lib/admin.ts).

async function operator(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email && isOperator(user.email) ? user.email : null
}

export async function GET() {
  if (!(await operator())) return Response.json({ error: "Nicht berechtigt" }, { status: 403 })
  const db = waitlistDb()
  const stats = db ? await waitlistStats(db) : null
  if (!stats) return Response.json({ error: "Warteliste nicht erreichbar (Migration 037?)" }, { status: 503 })
  return Response.json({ ...stats, waitlistMode: isWaitlistMode() })
}

export async function POST(req: Request) {
  const email = await operator()
  if (!email) return Response.json({ error: "Nicht berechtigt" }, { status: 403 })
  const db = waitlistDb()
  if (!db) return Response.json({ error: "Datenbank nicht erreichbar" }, { status: 503 })

  const { action } = (await req.json().catch(() => ({}))) as { action?: string }

  try {
    if (action === "test") {
      // Austragelink zeigt auf eine id, die es nicht gibt: Ein Klick darauf
      // im Test löscht nichts.
      const url = absoluteUrl(`/warteliste/abmelden/${unsubscribeToken("00000000-0000-4000-8000-000000000000")}`)
      const ok = await sendWaitlistLaunch({ to: email, unsubscribeUrl: url })
      return Response.json({ ok, to: email }, { status: ok ? 200 : 502 })
    }

    if (action === "send") {
      // Solange die Coming-Soon-Seite aktiv ist, führt "Jetzt starten" ins Leere.
      if (isWaitlistMode()) {
        return Response.json(
          { error: "Revetly ist noch im Wartelisten-Modus. Erst NEXT_PUBLIC_LAUNCH_MODE entfernen und neu deployen." },
          { status: 409 },
        )
      }
      return Response.json(await sendLaunchBatch(db))
    }

    if (action === "purge") return Response.json({ deleted: await purgePending(db) })

    return Response.json({ error: "Unbekannte Aktion" }, { status: 400 })
  } catch (err) {
    console.error("[admin/waitlist]", err)
    return Response.json({ error: err instanceof Error ? err.message : "Fehler" }, { status: 500 })
  }
}
