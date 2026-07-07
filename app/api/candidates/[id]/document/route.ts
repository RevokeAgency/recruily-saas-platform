import { createClient as createServer } from "@/lib/supabase/server"
import { createClient as createAdmin } from "@supabase/supabase-js"
import { NextRequest } from "next/server"

export const dynamic = "force-dynamic"

// Returns a short-lived signed URL for a candidate's CV or cover letter.
// The private `resumes` bucket is only reachable with the service role, so we
// verify ownership with the signed-in user first, then sign with the admin key.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const type = new URL(req.url).searchParams.get("type") === "cover" ? "cover" : "resume"

    const server = await createServer()
    const { data: { user } } = await server.auth.getUser()
    if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

    const { data: candidate } = await server
      .from("candidates")
      .select("resume_path, cover_letter_path, user_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()
    if (!candidate) return Response.json({ error: "Nicht gefunden" }, { status: 404 })

    const path = type === "cover" ? candidate.cover_letter_path : candidate.resume_path
    if (!path) return Response.json({ error: "Dokument nicht vorhanden" }, { status: 404 })

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )
    const { data, error } = await admin.storage.from("resumes").createSignedUrl(path, 300)
    if (error || !data?.signedUrl) {
      return Response.json({ error: "Konnte Dokument nicht laden" }, { status: 500 })
    }

    return Response.json({ url: data.signedUrl })
  } catch (error) {
    console.error("[document] error:", error)
    return Response.json({ error: "Interner Serverfehler" }, { status: 500 })
  }
}
