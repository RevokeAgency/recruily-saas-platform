import { createClient as createServer } from "@/lib/supabase/server"
import { createClient as createAdmin } from "@supabase/supabase-js"
import { NextRequest } from "next/server"
import { extractDocumentText, isPdfFile } from "@/lib/cv-parse"
import { extractCandidatePhoto } from "@/lib/cv-photo"

export const dynamic = "force-dynamic"
export const maxDuration = 60

function fileExt(name: string, fallback: string): string {
  const e = name.split(".").pop()?.toLowerCase()
  return e && e.length <= 5 ? e : fallback
}

// Attaches a CV and/or cover letter to an existing candidate (manual add flow):
// stores both in the private `resumes` bucket, best-effort extracts a profile
// photo from the CV, and updates the candidate. Ownership-checked; storage
// writes use the service role (path scoped to the owner).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const server = await createServer()
    const { data: { user } } = await server.auth.getUser()
    if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

    const { data: candidate } = await server
      .from("candidates").select("id").eq("id", id).eq("user_id", user.id).single()
    if (!candidate) return Response.json({ error: "Kandidat nicht gefunden" }, { status: 404 })

    const form = await req.formData()
    const cvFile = form.get("cv") as File | null
    const coverFile = form.get("cover") as File | null
    if (!cvFile && !coverFile) return Response.json({ success: true })

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )

    const update: Record<string, unknown> = {}

    if (cvFile) {
      const buf = Buffer.from(await cvFile.arrayBuffer())
      const path = `${user.id}/${id}/cv.${fileExt(cvFile.name, "pdf")}`
      await admin.storage.from("resumes").upload(path, buf, {
        contentType: cvFile.type || "application/pdf", upsert: true,
      })
      update.resume_path = path

      if (isPdfFile(cvFile.type, cvFile.name)) {
        const photo = await extractCandidatePhoto(buf)
        if (photo) {
          const pp = `${user.id}/${id}.jpg`
          const { error } = await admin.storage.from("candidate-photos").upload(pp, photo, {
            contentType: "image/jpeg", upsert: true,
          })
          if (!error) update.photo_url = admin.storage.from("candidate-photos").getPublicUrl(pp).data.publicUrl
        }
      }
    }

    if (coverFile) {
      const buf = Buffer.from(await coverFile.arrayBuffer())
      const path = `${user.id}/${id}/cover.${fileExt(coverFile.name, "pdf")}`
      await admin.storage.from("resumes").upload(path, buf, {
        contentType: coverFile.type || "application/pdf", upsert: true,
      })
      update.cover_letter_path = path
      const text = await extractDocumentText(buf, coverFile.type, coverFile.name)
      if (text) update.cover_letter_text = text
    }

    if (Object.keys(update).length > 0) {
      const { error } = await admin.from("candidates").update(update).eq("id", id)
      if (error) console.error("[candidate upload] enrichment skipped:", error.message)
    }

    return Response.json({ success: true, ...update })
  } catch (error) {
    console.error("[candidate upload] error:", error)
    return Response.json({ error: "Interner Serverfehler" }, { status: 500 })
  }
}
