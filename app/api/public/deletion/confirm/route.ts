import { NextRequest } from "next/server"
import { createClient as createAdmin } from "@supabase/supabase-js"
import { verifyDeletionToken } from "@/lib/dsgvo/token"

export const dynamic = "force-dynamic"

// Applicant self-service deletion — step 2: confirm. POST-only (so email link
// prefetchers can't trigger it): verifies the signed token, then erases every
// candidate record with that email across all customers, including the stored
// documents and photo. Idempotent.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const token = String(body.token || "")
    const email = verifyDeletionToken(token)
    if (!email) {
      return Response.json({ error: "Link ungültig oder abgelaufen." }, { status: 400 })
    }

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )

    const { data: rows } = await admin
      .from("candidates")
      .select("id, user_id, resume_path, cover_letter_path")
      .ilike("email", email)

    const candidates = rows ?? []
    let deleted = 0

    for (const c of candidates) {
      // Remove personal files first (best-effort — must not block the row delete).
      try {
        const folder = `${c.user_id}/${c.id}`
        const { data: files } = await admin.storage.from("resumes").list(folder)
        const paths = (files ?? []).map((f) => `${folder}/${f.name}`)
        if (c.resume_path) paths.push(c.resume_path)
        if (c.cover_letter_path) paths.push(c.cover_letter_path)
        if (paths.length) await admin.storage.from("resumes").remove([...new Set(paths)])
        await admin.storage.from("candidate-photos").remove([`${c.user_id}/${c.id}.png`])
      } catch (err) {
        console.error("[deletion confirm] storage cleanup failed:", err)
      }

      const { error } = await admin.from("candidates").delete().eq("id", c.id)
      if (!error) deleted++
    }

    return Response.json({ ok: true, deleted })
  } catch (error) {
    console.error("[deletion confirm] error:", error)
    return Response.json({ error: "Löschung fehlgeschlagen" }, { status: 500 })
  }
}
