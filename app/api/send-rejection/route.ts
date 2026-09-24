import { NextResponse } from "next/server"
import { createClient as createAdmin } from "@supabase/supabase-js"

import { mailProvider } from "@/lib/email/client"
import { sendRejectionMail } from "@/lib/email/rejection"
import { consumeRateLimit } from "@/lib/rate-limit"
import { createClient } from "@/lib/supabase/server"

/**
 * Absage-Mail an einen einzelnen Bewerber. Seit Positionierung v2 in allen
 * Plänen verfügbar ("Absagen mit einem Klick").
 *
 * Früher nahm der Endpunkt Empfänger, Name, Stelle und Text ungeprüft aus der
 * Anfrage und setzte den Text roh ins HTML. Solange nur Growth und Pro ihn
 * nutzen konnten, war das Risiko begrenzt. Für alle Pläne offen, wäre es ein
 * Versandweg für beliebige Mails an beliebige Adressen über die
 * Absenderdomain. Deshalb jetzt:
 *   - Empfänger, Name und Stelle kommen aus dem eigenen job_candidate,
 *     nie aus der Anfrage.
 *   - Der Text wird für HTML maskiert (lib/email/rejection.ts).
 *   - Mengenbremse pro Konto.
 */
export async function POST(req: Request) {
  try {
    if (!mailProvider()) {
      return NextResponse.json({ error: "E-Mail-Versand ist nicht eingerichtet" }, { status: 503 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const linkId = typeof body.linkId === "string" ? body.linkId : null
    const customText = typeof body.customText === "string" ? body.customText : null
    if (!linkId) return NextResponse.json({ error: "linkId fehlt" }, { status: 400 })

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )
    // Einzelabsagen sind Handarbeit. 60 pro Stunde reichen dafür weit, ganze
    // Stellen schließt /api/jobs/[id]/close mit eigener Grenze.
    const grenze = await consumeRateLimit(admin, "rejection_user", user.id, 60, 3600)
    if (!grenze.allowed) {
      return NextResponse.json({ error: "Zu viele Absagen in kurzer Zeit. Bitte später erneut versuchen." }, { status: 429 })
    }

    // RLS und user_id-Filter: nur eigene Bewerber.
    const { data: link } = await supabase
      .from("job_candidates")
      .select("id, candidate:candidates(full_name, email), job:jobs(title, company)")
      .eq("id", linkId)
      .eq("user_id", user.id)
      .single()

    const candidate = (link?.candidate ?? null) as { full_name?: string | null; email?: string | null } | null
    const job = (link?.job ?? null) as { title?: string | null; company?: string | null } | null
    if (!link || !candidate || !job) {
      return NextResponse.json({ error: "Bewerbung nicht gefunden" }, { status: 404 })
    }
    if (!candidate.email) {
      return NextResponse.json({ error: "Für diesen Bewerber ist keine E-Mail-Adresse hinterlegt" }, { status: 422 })
    }

    const sent = await sendRejectionMail({
      to: candidate.email,
      candidateName: candidate.full_name || "Bewerberin, Bewerber",
      jobTitle: job.title || "die ausgeschriebene Stelle",
      companyName: job.company || "unser Unternehmen",
      text: customText,
    })
    if (!sent) return NextResponse.json({ error: "Versand fehlgeschlagen" }, { status: 502 })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error sending rejection email:", error)
    return NextResponse.json({ error: "Versand fehlgeschlagen" }, { status: 500 })
  }
}
