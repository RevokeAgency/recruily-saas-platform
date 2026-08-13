import { NextRequest } from "next/server"

import { createClient as createServer } from "@/lib/supabase/server"
import { encryptionAvailable } from "@/lib/scheduling/crypto"
import { providerConfigured } from "@/lib/scheduling/providers"
import { adminClient } from "@/lib/scheduling/store"

export const dynamic = "force-dynamic"

async function requireUser() {
  const supabase = await createServer()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Tokens werden hier nie ausgeliefert. Der Client sieht nur, welches Konto
// hängt und ob es funktioniert.
const PUBLIC_COLUMNS =
  "id, provider, account_email, busy_enabled, write_enabled, last_error, last_error_at, created_at"

/**
 * Verbundene Konten plus die Frage, welche Anbieter überhaupt eingerichtet
 * sind. Beides in einer Antwort, damit der Einladungs-Dialog mit einem einzigen
 * Aufruf entscheiden kann, ob er den Verbinden-Schritt zeigt.
 */
export async function GET() {
  const user = await requireUser()
  if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

  const setup = {
    encryptionReady: encryptionAvailable(),
    google: providerConfigured("google"),
    microsoft: providerConfigured("microsoft"),
  }

  const { data, error } = await adminClient()
    .from("calendar_accounts")
    .select(PUBLIC_COLUMNS)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })

  if (error) {
    // Fehlt Migration 025, gibt es schlicht noch keine Konten.
    return Response.json({ accounts: [], setup, verfuegbar: false })
  }

  return Response.json({
    accounts: data ?? [],
    setup,
    // Kann überhaupt jemand verbinden? Steuert, ob der Dialog den Schritt zeigt.
    verfuegbar: setup.encryptionReady && (setup.google || setup.microsoft),
  })
}

/** Belegtzeiten-Abgleich oder Schreibzugriff pro Konto umschalten. */
export async function PATCH(req: NextRequest) {
  const user = await requireUser()
  if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as {
    id?: string
    busyEnabled?: boolean
    writeEnabled?: boolean
  }
  if (!body.id) return Response.json({ error: "Kein Konto angegeben." }, { status: 400 })

  const update: Record<string, boolean> = {}
  if (typeof body.busyEnabled === "boolean") update.busy_enabled = body.busyEnabled
  if (typeof body.writeEnabled === "boolean") update.write_enabled = body.writeEnabled
  if (Object.keys(update).length === 0) return Response.json({ ok: true })

  const { error } = await adminClient()
    .from("calendar_accounts")
    .update(update)
    .eq("id", body.id)
    .eq("user_id", user.id)

  if (error) return Response.json({ error: "Konnte die Einstellung nicht speichern." }, { status: 500 })
  return Response.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const user = await requireUser()
  if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

  const id = new URL(req.url).searchParams.get("id")
  if (!id) return Response.json({ error: "Kein Konto angegeben." }, { status: 400 })

  // Bereits eingetragene Termine bleiben im fremden Kalender stehen. Sie dort
  // stillschweigend zu löschen wäre ein größerer Eingriff als das Trennen der
  // Verbindung, um das der Kunde gebeten hat.
  const { error } = await adminClient()
    .from("calendar_accounts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) return Response.json({ error: "Konnte die Verbindung nicht trennen." }, { status: 500 })
  return Response.json({ ok: true })
}
