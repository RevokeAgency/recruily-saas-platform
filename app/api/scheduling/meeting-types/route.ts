import { NextRequest } from "next/server"

import { createClient as createServer } from "@/lib/supabase/server"
import { adminClient, loadMeetingTypes, mapMeetingType } from "@/lib/scheduling/store"
import type { LocationKind } from "@/lib/scheduling/types"

export const dynamic = "force-dynamic"

const KINDS: LocationKind[] = ["video_auto", "custom_link", "phone", "onsite"]

async function requireUser() {
  const supabase = await createServer()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

interface Body {
  id?: string
  name?: string
  description?: string | null
  durationMinutes?: number
  locationKind?: LocationKind
  locationValue?: string | null
  isDefault?: boolean
  active?: boolean
}

function normalize(body: Body, userId: string) {
  const kind: LocationKind = KINDS.includes(body.locationKind as LocationKind)
    ? (body.locationKind as LocationKind)
    : "video_auto"

  const duration = Math.min(480, Math.max(5, Math.round(Number(body.durationMinutes) || 30)))

  return {
    user_id: userId,
    name: String(body.name ?? "").trim().slice(0, 120) || "Gespräch",
    description: body.description?.toString().trim().slice(0, 500) || null,
    duration_minutes: duration,
    location_kind: kind,
    // Ein eigener Videolink oder eine Adresse ergibt nur bei diesen zwei Arten
    // Sinn; bei den anderen würde ein Restwert später falsch angezeigt.
    location_value:
      kind === "custom_link" || kind === "onsite"
        ? body.locationValue?.toString().trim().slice(0, 500) || null
        : null,
    is_default: body.isDefault === true,
    active: body.active !== false,
  }
}

/** Genau eine Terminart darf Standard sein. */
async function clearOtherDefaults(userId: string, keepId: string) {
  await adminClient()
    .from("meeting_types")
    .update({ is_default: false })
    .eq("user_id", userId)
    .neq("id", keepId)
}

export async function GET() {
  const user = await requireUser()
  if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })
  return Response.json({ meetingTypes: await loadMeetingTypes(adminClient(), user.id) })
}

export async function POST(req: NextRequest) {
  const user = await requireUser()
  if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as Body
  const { data, error } = await adminClient()
    .from("meeting_types")
    .insert(normalize(body, user.id))
    .select("*")
    .single()

  if (error || !data) {
    console.error("[scheduling] Terminart anlegen fehlgeschlagen:", error)
    return Response.json({ error: "Konnte die Terminart nicht anlegen." }, { status: 500 })
  }

  if (data.is_default) await clearOtherDefaults(user.id, data.id)
  return Response.json({ meetingType: mapMeetingType(data) })
}

export async function PATCH(req: NextRequest) {
  const user = await requireUser()
  if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as Body
  if (!body.id) return Response.json({ error: "Keine Terminart angegeben." }, { status: 400 })

  const { user_id: _ignored, ...fields } = normalize(body, user.id)
  const { data, error } = await adminClient()
    .from("meeting_types")
    .update(fields)
    .eq("id", body.id)
    .eq("user_id", user.id)
    .select("*")
    .single()

  if (error || !data) {
    return Response.json({ error: "Konnte die Terminart nicht speichern." }, { status: 500 })
  }

  if (data.is_default) await clearOtherDefaults(user.id, data.id)
  return Response.json({ meetingType: mapMeetingType(data) })
}

export async function DELETE(req: NextRequest) {
  const user = await requireUser()
  if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

  const id = new URL(req.url).searchParams.get("id")
  if (!id) return Response.json({ error: "Keine Terminart angegeben." }, { status: 400 })

  // Nicht löschen, sondern stilllegen: An der Terminart hängen Buchungen, und
  // deren Verlauf soll lesbar bleiben.
  const { error } = await adminClient()
    .from("meeting_types")
    .update({ active: false, is_default: false })
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) return Response.json({ error: "Konnte die Terminart nicht entfernen." }, { status: 500 })
  return Response.json({ ok: true })
}
