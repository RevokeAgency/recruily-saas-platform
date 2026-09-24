import { NextRequest } from "next/server"
import { createClient as createAdmin } from "@supabase/supabase-js"

import { mailProvider } from "@/lib/email/client"
import { sendRejectionMail } from "@/lib/email/rejection"
import { consumeRateLimit } from "@/lib/rate-limit"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
// Viele Absagen hintereinander brauchen Zeit; siehe PARALLEL unten.
export const maxDuration = 300

// Status, mit denen ein Bewerber als entschieden gilt und keine Absage mehr
// bekommt. Die App schreibt deutsche Werte, ältere Zeilen englische.
const DECIDED = ["Eingestellt", "hired", "Abgesagt", "rejected"]

// Gleichzeitige Mails. Genug, um eine Stelle mit hundert Bewerbern in
// Sekunden abzuschließen, ohne den Mailanbieter mit einem Schlag zu fluten.
const PARALLEL = 5

// Obergrenze pro Abschluss. Eine Stelle mit mehr offenen Bewerbern ist
// entweder ein Sonderfall oder ein Versehen; dann lieber in Etappen.
const MAX_MAILS = 500

type OpenLink = {
  id: string
  candidate: { full_name?: string | null; email?: string | null } | null
}

/**
 * Stelle abschließen: "Du triffst die Wahl, Revetly schließt die Stelle ab
 * und verschickt die Absagen."
 *
 * Schließt die Stelle (keine neuen Bewerbungen), setzt alle noch offenen
 * Bewerber auf "Abgesagt" und verschickt, wenn gewünscht, jedem eine Absage.
 * Wer eingestellt oder schon abgesagt ist, bleibt unberührt.
 *
 * Body:
 *   { preview: true }   nur zählen, nichts ändern (für den Bestätigungsdialog)
 *   { notify: boolean } abschließen, mit oder ohne Absage-Mails
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: jobId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const preview = body.preview === true
    const notify = body.notify === true

    const { data: job } = await supabase
      .from("jobs").select("id, title, company, is_active").eq("id", jobId).eq("user_id", user.id).single()
    if (!job) return Response.json({ error: "Stelle nicht gefunden" }, { status: 404 })

    const { data: links, error: linksErr } = await supabase
      .from("job_candidates")
      .select("id, status, candidate:candidates(full_name, email)")
      .eq("job_id", jobId)
      .eq("user_id", user.id)
    if (linksErr) return Response.json({ error: linksErr.message }, { status: 500 })

    const all = (links ?? []) as unknown as (OpenLink & { status: string | null })[]
    const open = all.filter((l) => !DECIDED.includes(l.status ?? ""))
    const hired = all.filter((l) => l.status === "Eingestellt" || l.status === "hired").length
    const withEmail = open.filter((l) => !!l.candidate?.email)

    if (preview) {
      return Response.json({
        open: open.length,
        withEmail: withEmail.length,
        hired,
        canEmail: !!mailProvider(),
      })
    }

    if (notify) {
      const admin = createAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } },
      )
      const grenze = await consumeRateLimit(admin, "close_job_user", user.id, 10, 3600)
      if (!grenze.allowed) {
        return Response.json({ error: "Zu viele Abschlüsse in kurzer Zeit. Bitte später erneut versuchen." }, { status: 429 })
      }
      if (withEmail.length > MAX_MAILS) {
        return Response.json(
          { error: `Mehr als ${MAX_MAILS} offene Bewerber mit E-Mail. Bitte zuerst einen Teil einzeln absagen.` },
          { status: 422 },
        )
      }
    }

    // 1. Stelle schließen.
    const { error: closeErr } = await supabase
      .from("jobs").update({ is_active: false }).eq("id", jobId).eq("user_id", user.id)
    if (closeErr) return Response.json({ error: closeErr.message }, { status: 500 })

    // 2. Offene Bewerber absagen. Der Status wird vor dem Versand gesetzt:
    //    Scheitert eine Mail, ist die Entscheidung trotzdem festgehalten, und
    //    ein zweiter Abschluss schickt niemandem eine doppelte Absage.
    if (open.length > 0) {
      const { error: rejErr } = await supabase
        .from("job_candidates")
        .update({ status: "Abgesagt" })
        .in("id", open.map((l) => l.id))
        .eq("user_id", user.id)
      if (rejErr) return Response.json({ error: rejErr.message }, { status: 500 })
    }

    // 3. Absage-Mails.
    let emailed = 0
    let failed = 0
    if (notify && mailProvider()) {
      const queue = [...withEmail]
      const worker = async () => {
        for (let l = queue.shift(); l; l = queue.shift()) {
          const ok = await sendRejectionMail({
            to: l.candidate!.email!,
            candidateName: l.candidate?.full_name || "Bewerberin, Bewerber",
            jobTitle: job.title || "die ausgeschriebene Stelle",
            companyName: job.company || "unser Unternehmen",
          }).catch(() => false)
          if (ok) emailed++
          else failed++
        }
      }
      await Promise.all(Array.from({ length: Math.min(PARALLEL, queue.length) }, worker))
    }

    return Response.json({
      closed: true,
      rejected: open.length,
      emailed,
      failed,
      withoutEmail: open.length - withEmail.length,
    })
  } catch (error) {
    console.error("[jobs/close] error:", error)
    return Response.json({ error: "Stelle konnte nicht abgeschlossen werden" }, { status: 500 })
  }
}
