import { createClient as createServer } from "@/lib/supabase/server"
import { createClient as createAdmin } from "@supabase/supabase-js"
import { NextRequest } from "next/server"
import { extractCandidatePhotoDetailed } from "@/lib/cv-photo"
import { PHOTO_BUCKET, candidatePhotoPath, candidatePhotoUrl } from "@/lib/candidate-photo"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// Liefert das Foto eines Kandidaten aus, nur an das Konto, dem er gehört.
// Leitet auf einen signierten Link weiter (1 Stunde gültig). Der Browser darf
// die Weiterleitung privat zwischenspeichern, etwas kürzer als der Link gilt.
// Siehe lib/candidate-photo.ts.
const SIGNED_SECONDS = 60 * 60

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const server = await createServer()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return new Response(null, { status: 401 })

  const { data: candidate } = await server
    .from("candidates").select("id").eq("id", id).eq("user_id", user.id).single()
  if (!candidate) return new Response(null, { status: 404 })

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  const { data, error } = await admin.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(candidatePhotoPath(user.id, id), SIGNED_SECONDS)
  if (error || !data?.signedUrl) return new Response(null, { status: 404 })

  return new Response(null, {
    status: 302,
    headers: {
      Location: data.signedUrl,
      "Cache-Control": `private, max-age=${SIGNED_SECONDS - 300}`,
    },
  })
}

// Re-runs profile-photo extraction on a candidate's stored CV and reports what
// happened at each step. Owner-checked; storage via service role.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const server = await createServer()
    const { data: { user } } = await server.auth.getUser()
    if (!user) return Response.json({ ok: false, error: "Nicht authentifiziert" }, { status: 401 })

    const { data: candidate } = await server
      .from("candidates").select("id, resume_path").eq("id", id).eq("user_id", user.id).single()
    if (!candidate) return Response.json({ ok: false, error: "Kandidat nicht gefunden" }, { status: 404 })
    if (!candidate.resume_path) {
      return Response.json({ ok: false, error: "Kein Lebenslauf gespeichert" }, { status: 400 })
    }
    if (!candidate.resume_path.toLowerCase().endsWith(".pdf")) {
      return Response.json({ ok: false, error: "Foto-Extraktion ist nur für PDF-Lebensläufe möglich" }, { status: 400 })
    }

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )

    const { data: file, error: dlErr } = await admin.storage.from("resumes").download(candidate.resume_path)
    if (dlErr || !file) {
      return Response.json({ ok: false, error: "Lebenslauf konnte nicht geladen werden", detail: dlErr?.message }, { status: 500 })
    }
    const buffer = Buffer.from(await file.arrayBuffer())

    const { photo, diag } = await extractCandidatePhotoDetailed(buffer)

    if (!photo) {
      return Response.json({ ok: false, reason: diag.reason, diag })
    }

    const photoPath = `${user.id}/${id}.png`
    const { error: upErr } = await admin.storage.from("candidate-photos").upload(photoPath, photo, {
      contentType: "image/png", upsert: true,
    })
    if (upErr) {
      return Response.json({ ok: false, reason: "Upload ins Foto-Bucket fehlgeschlagen", detail: upErr.message, diag }, { status: 500 })
    }
    const photoUrl = candidatePhotoUrl(id)
    await admin.from("candidates").update({ photo_url: photoUrl }).eq("id", id)

    return Response.json({ ok: true, photoUrl, diag })
  } catch (error) {
    console.error("[photo retry] error:", error)
    return Response.json({ ok: false, error: "Interner Serverfehler", detail: String(error) }, { status: 500 })
  }
}
