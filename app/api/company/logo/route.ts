import { createClient as createServer } from "@/lib/supabase/server"
import { NextRequest } from "next/server"

export const dynamic = "force-dynamic"

const BUCKET = "logos"
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"]

// Uploads a company logo to the public `logos` Storage bucket and stores its URL
// on user_profiles.logo_url. Runs as the signed-in user: Storage RLS (migration
// 011) lets them write only inside their own {user_id}/ folder, so no
// service-role key is needed. Used by onboarding and settings.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

    const form = await req.formData()
    const file = form.get("file") as File | null
    if (!file) return Response.json({ error: "Keine Datei" }, { status: 400 })
    if (!ALLOWED.includes(file.type)) {
      return Response.json({ error: "Nur PNG, JPG, WEBP oder SVG erlaubt" }, { status: 400 })
    }
    if (file.size > 2 * 1024 * 1024) {
      return Response.json({ error: "Maximale Dateigröße: 2 MB" }, { status: 400 })
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "png"
    const path = `${user.id}/logo-${Date.now()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: true })
    if (upErr) {
      console.error("[logo] upload failed:", upErr)
      return Response.json(
        { error: "Upload fehlgeschlagen. Ist die Migration 011 (Storage-Bucket 'logos') eingespielt?" },
        { status: 500 },
      )
    }

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
    const logoUrl = pub.publicUrl

    const { error: updErr } = await supabase
      .from("user_profiles")
      .update({ logo_url: logoUrl })
      .eq("id", user.id)
    if (updErr) {
      console.error("[logo] profile update failed:", updErr)
      return Response.json({ error: "Logo gespeichert, aber Profil-Update fehlgeschlagen" }, { status: 500 })
    }

    return Response.json({ success: true, logoUrl })
  } catch (error) {
    console.error("[logo] error:", error)
    return Response.json({ error: "Interner Serverfehler" }, { status: 500 })
  }
}
