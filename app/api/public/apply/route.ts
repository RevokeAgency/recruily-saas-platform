import { createClient } from "@supabase/supabase-js"
import { NextRequest, after } from "next/server"
import { consumeMatch } from "@/lib/quota"
import { scoreJobCandidateLink } from "@/lib/scoring"
import { parseCvBuffer, isUsableCandidate, isPdfFile, extractDocumentText } from "@/lib/cv-parse"
import { extractCandidatePhoto } from "@/lib/cv-photo"
import { sendApplicationReceived } from "@/lib/email/send"
import { captureAndNotify } from "@/lib/monitoring/capture"
import {
  consumeRateLimit,
  emailKey,
  pruefeDatei,
  requesterKey,
  tooManyRequests,
} from "@/lib/rate-limit"

export const dynamic = "force-dynamic"
export const maxDuration = 300

// Service-role client — bypasses RLS for public application submissions.
// Every write is scoped to the job owner's user_id explicitly.
function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set")
  return createClient(url, key, { auth: { persistSession: false } })
}

const RESUMES = "resumes"
const PHOTOS = "candidate-photos"

function fileExt(name: string, fallback: string): string {
  const e = name.split(".").pop()?.toLowerCase()
  return e && e.length <= 5 ? e : fallback
}

/**
 * Public application intake (multipart). One call does the whole pipeline:
 * resolve job+owner, parse CV (+ cover letter), create the candidate, store
 * both documents in the private `resumes` bucket, best-effort extract a profile
 * photo, then consume a match and score (or queue when over the limit).
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const jobId = form.get("jobId") as string | null
    const firstName = ((form.get("firstName") as string) || "").trim()
    const lastName = ((form.get("lastName") as string) || "").trim()
    const email = ((form.get("email") as string) || "").trim()
    const phone = ((form.get("phone") as string) || "").trim()
    const message = ((form.get("message") as string) || "").trim()
    const cvFile = form.get("cv") as File | null
    const coverFile = form.get("cover") as File | null

    if (!jobId || !cvFile) {
      return Response.json({ error: "Lebenslauf und Job sind erforderlich" }, { status: 400 })
    }
    const fullName = `${firstName} ${lastName}`.trim()
    if (!fullName) return Response.json({ error: "Name ist erforderlich" }, { status: 400 })

    // Dateien prüfen, BEVOR irgendetwas gelesen oder gespeichert wird.
    for (const [datei, feld] of [[cvFile, "Der Lebenslauf"], [coverFile, "Das Anschreiben"]] as const) {
      if (!datei) continue
      const pruefung = pruefeDatei(datei, feld)
      if (!pruefung.ok) return Response.json({ error: pruefung.fehler }, { status: 400 })
    }

    const supabase = createServiceClient()

    // ── Missbrauchsschutz ─────────────────────────────────────────────────
    // Jede Bewerbung verbraucht einen Match aus dem Kontingent des Kunden und
    // startet einen Modelllauf. Zwei Grenzen: eine gegen den einzelnen
    // Absender, eine gegen den Ansturm auf eine einzelne Stelle, falls jemand
    // über wechselnde Adressen kommt.
    const absender = requesterKey(req)
    const proAbsender = await consumeRateLimit(supabase, "apply_ip", absender, 5, 3600)
    if (!proAbsender.allowed) {
      return tooManyRequests(
        proAbsender,
        "Es sind bereits mehrere Bewerbungen von diesem Anschluss eingegangen. Bitte versuche es später noch einmal.",
      )
    }
    const proStelle = await consumeRateLimit(supabase, "apply_job", jobId, 40, 3600)
    if (!proStelle.allowed) {
      return tooManyRequests(
        proStelle,
        "Für diese Stelle gehen gerade sehr viele Bewerbungen ein. Bitte versuche es in einer Stunde noch einmal.",
      )
    }
    if (email) {
      const proAdresse = await consumeRateLimit(supabase, "apply_email", emailKey(email), 3, 86400)
      if (!proAdresse.allowed) {
        return tooManyRequests(
          proAdresse,
          "Von dieser E-Mail-Adresse sind heute bereits mehrere Bewerbungen eingegangen.",
        )
      }
    }

    // Resolve the job -> owner (the applicant is always filed to the job owner).
    const { data: job, error: jobError } = await supabase
      .from("jobs").select("id, user_id, title, company").eq("id", jobId).eq("is_active", true).single()
    if (jobError || !job) {
      return Response.json({ error: "Job nicht gefunden oder inaktiv" }, { status: 404 })
    }
    const ownerId = job.user_id as string

    // Doppelbewerbung: dieselbe Adresse, dieselbe Stelle. Ohne diese Prüfung
    // erzeugt ein doppelter Klick auf "Absenden" zwei Kandidaten und
    // verbraucht zwei Matches.
    if (email) {
      const { data: bekannt } = await supabase
        .from("candidates")
        .select("id")
        .eq("user_id", ownerId)
        .ilike("email", email)
        .limit(20)

      const ids = (bekannt ?? []).map((c) => c.id as string)
      if (ids.length > 0) {
        const { data: schonBeworben } = await supabase
          .from("job_candidates")
          .select("id")
          .eq("job_id", jobId)
          .in("candidate_id", ids)
          .limit(1)

        if (schonBeworben && schonBeworben.length > 0) {
          // Bewusst als Erfolg gemeldet: Der Bewerber soll nicht erfahren, ob
          // eine Adresse im System liegt, und für ihn ist der Fall erledigt.
          return Response.json({
            success: true,
            duplicate: true,
            message: "Deine Bewerbung für diese Stelle liegt uns bereits vor.",
          })
        }
      }
    }

    const cvBuf = Buffer.from(await cvFile.arrayBuffer())
    const coverBuf = coverFile ? Buffer.from(await coverFile.arrayBuffer()) : null

    // Cover-letter text = typed motivation + text of an uploaded cover letter.
    let coverText = message
    if (coverBuf && coverFile) {
      const t = await extractDocumentText(coverBuf, coverFile.type, coverFile.name)
      if (t) coverText = coverText ? `${coverText}\n\n${t}` : t
    }

    // Parse the CV and attempt the photo in parallel (both read the CV buffer).
    const [parsed, photo] = await Promise.all([
      parseCvBuffer(cvBuf, cvFile.type, cvFile.name, coverText || null),
      isPdfFile(cvFile.type, cvFile.name) ? extractCandidatePhoto(cvBuf) : Promise.resolve(null),
    ])

    const p = isUsableCandidate(parsed) ? parsed : null

    // Create the candidate scoped to the owner. Form fields win over parsed
    // contact data (the applicant typed them).
    const { data: candidate, error: candidateError } = await supabase
      .from("candidates")
      .insert({
        full_name: fullName,
        email: email || p?.email || null,
        phone: phone || p?.phone || null,
        job_title: p?.job_title || null,
        years_of_experience: Math.round(p?.years_of_experience || 0),
        experience_level: p?.experience_level || "mid",
        skills: p?.skills || [],
        education: p?.education || null,
        summary_ai: p?.summary_ai || null,
        location: p?.location || null,
        user_id: ownerId,
      })
      .select("id")
      .single()

    if (candidateError || !candidate) {
      console.error("[apply] create candidate failed:", candidateError)
      return Response.json({ error: "Fehler beim Erstellen des Kandidaten" }, { status: 500 })
    }

    // Store documents (private) + photo (public); failures here are non-fatal.
    const resumePath = `${ownerId}/${candidate.id}/cv.${fileExt(cvFile.name, "pdf")}`
    await supabase.storage.from(RESUMES).upload(resumePath, cvBuf, {
      contentType: cvFile.type || "application/pdf", upsert: true,
    }).catch(() => null)

    let coverPath: string | null = null
    if (coverBuf && coverFile) {
      coverPath = `${ownerId}/${candidate.id}/cover.${fileExt(coverFile.name, "pdf")}`
      await supabase.storage.from(RESUMES).upload(coverPath, coverBuf, {
        contentType: coverFile.type || "application/pdf", upsert: true,
      }).catch(() => null)
    }

    let photoUrl: string | null = null
    if (photo) {
      const photoPath = `${ownerId}/${candidate.id}.png`
      const { error: upErr } = await supabase.storage.from(PHOTOS).upload(photoPath, photo, {
        contentType: "image/png", upsert: true,
      })
      if (!upErr) photoUrl = supabase.storage.from(PHOTOS).getPublicUrl(photoPath).data.publicUrl
    }

    // Enrichment columns land here (migration 014). Best-effort: if the columns
    // aren't there yet the candidate + matching still work, just without docs.
    await supabase.from("candidates").update({
      resume_path: resumePath,
      cover_letter_path: coverPath,
      cover_letter_text: coverText || null,
      photo_url: photoUrl,
    }).eq("id", candidate.id).then(({ error }) => {
      if (error) console.error("[apply] document enrichment skipped:", error.message)
    })

    // Spend a match (or queue if over the limit) then link + score.
    const quota = await consumeMatch(supabase, ownerId)
    const status = quota.allowed ? "analyzing" : "queued"

    const { data: link, error: linkError } = await supabase
      .from("job_candidates")
      .insert({ job_id: jobId, candidate_id: candidate.id, status, user_id: ownerId })
      .select("id")
      .single()

    if (linkError || !link) {
      console.error("[apply] link failed:", linkError)
      return Response.json({ error: "Fehler beim Verknüpfen" }, { status: 500 })
    }

    // Tag the source for the activity feed. Best-effort (migration 013).
    await supabase.from("job_candidates").update({ source: "public_page" }).eq("id", link.id)
      .then(({ error }) => { if (error) console.error("[apply] source skipped:", error.message) })

    if (quota.allowed) {
      // Score after the response — after() ensures the work survives on
      // serverless (fire-and-forget got killed and left "analyzing" forever).
      // supabase here is already a service-role client, safe post-response.
      const linkId = link.id
      after(async () => {
        try { await scoreJobCandidateLink(supabase, linkId) }
        catch (err) { console.error("[apply] background scoring failed:", err) }
      })
    }

    // Send the applicant an eingangsbestätigung (best-effort, never blocks).
    await sendApplicationReceived({
      to: email || p?.email,
      candidateName: fullName,
      jobTitle: (job.title as string) || null,
      companyName: (job.company as string) || null,
    })

    return Response.json({ success: true, candidateId: candidate.id, scored: quota.allowed })
  } catch (error) {
    await captureAndNotify(error, { route: "/api/public/apply", method: "POST", status: 500 })
    return Response.json({ error: "Interner Serverfehler" }, { status: 500 })
  }
}
