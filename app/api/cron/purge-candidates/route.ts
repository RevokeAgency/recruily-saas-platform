import { NextRequest } from "next/server"
import { createClient as createAdmin } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// DSGVO retention: applicant data is erased after this many days unless the
// candidate is still in an active/successful pipeline.
const RETENTION_DAYS = 180
// Statuses that keep a candidate exempt from auto-deletion (active engagement).
const PROTECTED_STATUSES = ["Eingeladen", "interviewed", "hired", "shortlisted"]
// Cap per run so a daily cron never times out; the backlog drains over days.
const BATCH = 300

/**
 * Scheduled purge (Vercel Cron, daily). Deletes candidates whose data is older
 * than the retention window and who are not in an active/successful process,
 * including their stored documents and photo. Protected by CRON_SECRET
 * (Vercel sends it as a Bearer token on cron invocations).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get("authorization")
  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )

    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()

    const { data: oldRows } = await admin
      .from("candidates")
      .select("id, user_id, resume_path, cover_letter_path")
      .lt("created_at", cutoff)
      .limit(BATCH)

    const candidates = oldRows ?? []
    if (candidates.length === 0) return Response.json({ ok: true, scanned: 0, deleted: 0 })

    // Exclude anyone still in an active/successful process.
    const ids = candidates.map((c) => c.id)
    const { data: protectedLinks } = await admin
      .from("job_candidates")
      .select("candidate_id")
      .in("candidate_id", ids)
      .in("status", PROTECTED_STATUSES)
    const protectedIds = new Set((protectedLinks ?? []).map((l) => l.candidate_id as string))

    const toDelete = candidates.filter((c) => !protectedIds.has(c.id))
    let deleted = 0

    for (const c of toDelete) {
      try {
        const folder = `${c.user_id}/${c.id}`
        const { data: files } = await admin.storage.from("resumes").list(folder)
        const paths = (files ?? []).map((f) => `${folder}/${f.name}`)
        if (c.resume_path) paths.push(c.resume_path)
        if (c.cover_letter_path) paths.push(c.cover_letter_path)
        if (paths.length) await admin.storage.from("resumes").remove([...new Set(paths)])
        await admin.storage.from("candidate-photos").remove([`${c.user_id}/${c.id}.png`])
      } catch (err) {
        console.error("[purge] storage cleanup failed:", err)
      }
      const { error } = await admin.from("candidates").delete().eq("id", c.id)
      if (!error) deleted++
    }

    console.log(`[purge] scanned ${candidates.length}, deleted ${deleted} (retention ${RETENTION_DAYS}d)`)
    return Response.json({ ok: true, scanned: candidates.length, deleted })
  } catch (error) {
    console.error("[purge] error:", error)
    return Response.json({ error: "purge failed" }, { status: 500 })
  }
}
