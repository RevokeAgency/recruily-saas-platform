import { createClient as createAdmin, type SupabaseClient } from "@supabase/supabase-js"

import { escapeHtml, sendMail, shell } from "@/lib/email/client"
import { absoluteUrl } from "@/lib/site"

// ─────────────────────────────────────────────────────────────────────────────
// Benachrichtigungen an Recruiter über neue Bewerbungen.
//
// Zwei Wege, einstellbar pro Konto (Migration 031):
//   sofort:   eine Mail je Bewerbung, verschickt nach der Analyse, damit der
//             Match gleich mit drinsteht (Standard an)
//   täglich:  eine Zusammenfassung pro Morgen (Standard aus), Cron
//             /api/cron/application-digest
//
// Nur Bewerbungen, die von außen kommen (Stellenseite, E-Mail). Wer einen
// Kandidaten selbst anlegt, weiß davon und bekommt keine Mail.
//
// Inhalt bewusst knapp: Name, Stelle, Quelle, Match. Keine Unterlagen im
// Anhang, keine Kontaktdaten. Was mehr braucht, steht im Dashboard.
// ─────────────────────────────────────────────────────────────────────────────

const SOURCE_LABEL: Record<string, string> = {
  public_page: "über deine Stellenseite",
  email: "per E-Mail",
}

function admin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createAdmin(url, key, { auth: { persistSession: false } })
}

async function recruiterEmail(db: SupabaseClient, userId: string): Promise<string | null> {
  try {
    const { data } = await db.auth.admin.getUserById(userId)
    return data?.user?.email ?? null
  } catch {
    return null
  }
}

/** Liest die Einstellungen. Ohne Migration 031 gelten die Standards. */
async function preferences(db: SupabaseClient, userId: string): Promise<{ instant: boolean; daily: boolean }> {
  const { data } = await db.from("user_profiles").select("*").eq("id", userId).single()
  return {
    instant: data?.notify_applications_instant ?? true,
    daily: data?.notify_applications_daily ?? false,
  }
}

function one<T>(v: T | T[] | null | undefined): T | null {
  return (Array.isArray(v) ? v[0] : v) ?? null
}

function statusLine(status: string | null, score: number | null): string {
  if (score != null) return `Match: <strong>${score}</strong>`
  if (status === "queued") return "Die Analyse wartet, bis in deinem Kontingent wieder Matches frei sind."
  if (status === "error") return "Die Analyse ist fehlgeschlagen, im Dashboard kannst du sie neu starten."
  return "Die Analyse läuft noch."
}

function button(href: string, label: string): string {
  return `<p style="margin: 24px 0;"><a href="${href}" style="background: #0C1A16; color: #ffffff; padding: 12px 22px; border-radius: 999px; text-decoration: none; font-weight: 700; font-size: 14px;">${escapeHtml(label)}</a></p>`
}

const FOOTER =
  '<p style="margin: 24px 0 0; font-size: 12px; color: #94a3b8;">Diese Benachrichtigungen stellst du in den Einstellungen unter „Benachrichtigungen“ ein.</p>'

/**
 * Sofortmail für eine neue Bewerbung. Best-effort: wirft nie, liefert false,
 * wenn nichts verschickt wurde (abgeschaltet, keine Adresse, kein Versand).
 */
export async function notifyNewApplication(linkId: string): Promise<boolean> {
  const db = admin()
  if (!db) return false
  try {
    const { data: link } = await db
      .from("job_candidates")
      .select("id, user_id, job_id, status, match_score, source, job:jobs(title), candidate:candidates(full_name)")
      .eq("id", linkId)
      .single()
    if (!link?.user_id) return false

    const prefs = await preferences(db, link.user_id)
    if (!prefs.instant) return false
    const to = await recruiterEmail(db, link.user_id)
    if (!to) return false

    const job = one(link.job as { title?: string } | { title?: string }[] | null)?.title || "deine Stelle"
    const name = one(link.candidate as { full_name?: string } | { full_name?: string }[] | null)?.full_name || "Eine Person"
    const source = SOURCE_LABEL[(link.source as string) ?? ""] ?? ""

    const body = `
      <p style="margin: 0 0 16px;">Für <strong>${escapeHtml(job)}</strong> ist ${source ? `${source} ` : ""}eine neue Bewerbung eingegangen:</p>
      <p style="margin: 0 0 8px; font-size: 17px;"><strong>${escapeHtml(name)}</strong></p>
      <p style="margin: 0 0 16px;">${statusLine(link.status as string, (link.match_score as number | null) ?? null)}</p>
      ${button(absoluteUrl(`/jobs/${link.job_id}`), "Bewerbung ansehen")}
      ${FOOTER}
    `
    return await sendMail(
      { to, subject: `Neue Bewerbung: ${name} für ${job}`, html: shell("Revetly", body) },
      "Neue Bewerbung",
    )
  } catch (err) {
    console.error("[notify] Mail zu neuer Bewerbung übersprungen:", err)
    return false
  }
}

interface DigestRow {
  user_id: string
  job_id: string
  status: string | null
  match_score: number | null
  source: string | null
  created_at: string
  job: { title?: string } | { title?: string }[] | null
  candidate: { full_name?: string } | { full_name?: string }[] | null
}

/**
 * Tägliche Zusammenfassung: alle Bewerbungen der letzten 24 Stunden, pro
 * Konto eine Mail, nur für Konten mit eingeschalteter Zusammenfassung.
 */
export async function sendApplicationDigests(): Promise<{ accounts: number; sent: number }> {
  const db = admin()
  if (!db) return { accounts: 0, sent: 0 }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await db
    .from("job_candidates")
    .select("user_id, job_id, status, match_score, source, created_at, job:jobs(title), candidate:candidates(full_name)")
    .gte("created_at", since)
    .in("source", Object.keys(SOURCE_LABEL))
    .order("created_at", { ascending: true })
    .limit(5000)
  if (error) throw new Error(error.message)

  const byUser = new Map<string, DigestRow[]>()
  for (const row of (data ?? []) as DigestRow[]) {
    if (!row.user_id) continue
    byUser.set(row.user_id, [...(byUser.get(row.user_id) ?? []), row])
  }

  let sent = 0
  for (const [userId, rows] of byUser) {
    try {
      const prefs = await preferences(db, userId)
      if (!prefs.daily) continue
      const to = await recruiterEmail(db, userId)
      if (!to) continue

      // Nach Stelle gruppiert, innerhalb der Stelle nach Match absteigend.
      const byJob = new Map<string, DigestRow[]>()
      for (const r of rows) byJob.set(r.job_id, [...(byJob.get(r.job_id) ?? []), r])

      const sections = [...byJob.entries()]
        .map(([jobId, list]) => {
          const title = one(list[0].job)?.title || "Stelle"
          const items = [...list]
            .sort((a, b) => (b.match_score ?? -1) - (a.match_score ?? -1))
            .map((r) => {
              const name = one(r.candidate)?.full_name || "Eine Person"
              const score = r.match_score != null ? `Match ${r.match_score}` : r.status === "queued" ? "wartet auf Kontingent" : "Analyse läuft"
              return `<li style="margin: 0 0 6px;"><strong>${escapeHtml(name)}</strong> · ${score}</li>`
            })
            .join("")
          return `
            <p style="margin: 20px 0 8px;"><a href="${absoluteUrl(`/jobs/${jobId}`)}" style="color: #0C1A16; font-weight: 700;">${escapeHtml(title)}</a> (${list.length})</p>
            <ul style="margin: 0; padding-left: 18px;">${items}</ul>
          `
        })
        .join("")

      const count = rows.length
      const body = `
        <p style="margin: 0 0 8px;">In den letzten 24 Stunden ${count === 1 ? "ist eine neue Bewerbung" : `sind ${count} neue Bewerbungen`} eingegangen.</p>
        ${sections}
        ${button(absoluteUrl("/dashboard"), "Zum Dashboard")}
        ${FOOTER}
      `
      const ok = await sendMail(
        {
          to,
          subject: count === 1 ? "1 neue Bewerbung seit gestern" : `${count} neue Bewerbungen seit gestern`,
          html: shell("Revetly", body),
        },
        "Tägliche Zusammenfassung",
      )
      if (ok) sent++
    } catch (err) {
      console.error("[digest] Konto übersprungen:", err)
    }
  }
  return { accounts: byUser.size, sent }
}
