import { createClient } from "@/lib/supabase/server"
import { createClient as createAdmin } from "@supabase/supabase-js"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

    const { data: candidate, error } = await supabase
      .from("candidates")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (error) {
      return Response.json({ error: "Kandidat nicht gefunden" }, { status: 404 })
    }

    return Response.json({ candidate })
  } catch (error) {
    console.error("Error fetching candidate:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Deletes a candidate AND their stored documents/photo (DSGVO: no orphaned
// personal data left in Storage). Ownership-checked; job_candidates links are
// removed by the ON DELETE CASCADE on candidate_id.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

    // Confirm ownership (RLS also enforces this) and read the storage paths.
    const { data: candidate } = await supabase
      .from("candidates")
      .select("id, resume_path, cover_letter_path")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()
    if (!candidate) return Response.json({ error: "Kandidat nicht gefunden" }, { status: 404 })

    // Remove all personal files. Best-effort — a storage hiccup must not block
    // the DB deletion (the row disappearing is what the user asked for).
    try {
      const admin = createAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } },
      )

      // Documents live under `${user.id}/${candidateId}/…` in the private bucket.
      // List the folder so nothing is missed (cv + cover + any variants).
      const folder = `${user.id}/${id}`
      const { data: files } = await admin.storage.from("resumes").list(folder)
      const paths = (files ?? []).map((f) => `${folder}/${f.name}`)
      // Fall back to the known columns if the listing came back empty.
      if (candidate.resume_path) paths.push(candidate.resume_path)
      if (candidate.cover_letter_path) paths.push(candidate.cover_letter_path)
      if (paths.length) await admin.storage.from("resumes").remove([...new Set(paths)])

      // Public avatar: `${user.id}/${candidateId}.png`.
      await admin.storage.from("candidate-photos").remove([`${user.id}/${id}.png`])
    } catch (storageErr) {
      console.error("[candidate delete] storage cleanup failed:", storageErr)
    }

    const { error } = await supabase
      .from("candidates")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error("Error deleting candidate:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
