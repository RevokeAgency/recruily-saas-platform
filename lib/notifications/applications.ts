import { createClient as createAdmin, type SupabaseClient } from "@supabase/supabase-js"

import { sendMail } from "@/lib/email/client"
import { MAIL, avatar, button, escapeHtml, eyebrow, heading, panel, paragraph, shell } from "@/lib/email/layout"
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

const SOURCE_SHORT: Record<string, string> = {
  public_page: "Stellenseite",
  email: "E-Mail",
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

// Einordnung des Match in Worten. Dieselben Schwellen wie in der
// Kandidatenansicht (80 und 60), damit Mail und Dashboard dasselbe sagen.
function band(score: number): { label: string; color: string; bg: string } {
  if (score >= 80) return { label: "Sehr gute Passung", color: MAIL.greenDeep, bg: "#DDF6EA" }
  if (score >= 60) return { label: "Gute Passung", color: "#0B7FA3", bg: "#DDF3FB" }
  return { label: "Geringe Passung", color: MAIL.muted, bg: "#EAF0ED" }
}

function statusChip(status: string | null): string {
  const text = status === "queued" ? "Wartet auf Kontingent" : status === "error" ? "Analyse fehlgeschlagen" : "Analyse läuft"
  return `<span style="display:inline-block;padding:5px 11px;border-radius:999px;background:#EAF0ED;font-size:12px;font-weight:700;color:${MAIL.muted};white-space:nowrap;">${text}</span>`
}

/** Rechte Spalte der Kandidatenzeile: Match als Zahl mit Einordnung, sonst der Stand. */
function scoreCell(score: number | null, status: string | null, size: "lg" | "sm"): string {
  if (score == null) return statusChip(status)
  const b = band(score)
  if (size === "sm") {
    return `<span style="display:inline-block;min-width:34px;padding:5px 10px;border-radius:999px;background:${b.bg};font-size:14px;font-weight:800;color:${MAIL.ink};text-align:center;">${score}</span>`
  }
  return `<div style="font-size:34px;line-height:1;font-weight:800;letter-spacing:-0.03em;color:${MAIL.ink};">${score}</div>
    <div style="margin-top:6px;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${MAIL.greenDeep};">Match</div>`
}

/** Karte mit Initialen, Name, Stelle und Match. */
function candidateCard(opts: { name: string; meta: string; score: number | null; status: string | null }): string {
  const b = opts.score != null ? band(opts.score) : null
  return panel(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td width="44" valign="middle">${avatar(opts.name)}</td>
    <td valign="middle" style="padding:0 12px 0 14px;">
      <div style="font-size:17px;line-height:1.3;font-weight:800;letter-spacing:-0.015em;color:${MAIL.ink};">${escapeHtml(opts.name)}</div>
      <div style="margin-top:3px;font-size:13px;line-height:1.45;color:${MAIL.muted};">${opts.meta}</div>
      ${b ? `<div style="margin-top:9px;"><span style="display:inline-block;padding:4px 10px;border-radius:999px;background:${b.bg};font-size:12px;font-weight:700;color:${b.color};">${b.label}</span></div>` : ""}
    </td>
    <td valign="middle" align="right" style="white-space:nowrap;">${scoreCell(opts.score, opts.status, "lg")}</td>
  </tr></table>`)
}

const SETTINGS_NOTE = `Diese Benachrichtigungen stellst du in den <a href="${absoluteUrl("/settings")}" style="color:${MAIL.muted};text-decoration:underline;">Einstellungen</a> ein.`

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

    const score = (link.match_score as number | null) ?? null
    const status = (link.status as string | null) ?? null
    const sourceShort = SOURCE_SHORT[(link.source as string) ?? ""]
    const note =
      status === "queued"
        ? "Die Analyse startet, sobald in deinem Kontingent wieder Matches frei sind."
        : status === "error"
          ? "Die Analyse ist fehlgeschlagen. Im Dashboard kannst du sie neu starten."
          : score == null
            ? "Die Analyse läuft noch. Den Match siehst du in wenigen Augenblicken im Dashboard."
            : "Im Dashboard findest du die Unterlagen, die Belege zum Match und einen Gesprächsleitfaden."

    const body = `
      ${eyebrow("Neue Bewerbung")}
      ${heading(`${name} hat sich beworben`)}
      ${paragraph(`Für <strong style="color:${MAIL.ink};">${escapeHtml(job)}</strong> ist ${source ? `${source} ` : ""}eine neue Bewerbung eingegangen.`)}
      ${candidateCard({ name, meta: `${escapeHtml(job)}${sourceShort ? ` · ${sourceShort}` : ""}`, score, status })}
      ${button(absoluteUrl(`/jobs/${link.job_id}`), "Bewerbung ansehen")}
      ${paragraph(note, { muted: true, small: true, last: true })}
    `
    const preheader = score != null ? `Match ${score} · ${band(score).label} · ${job}` : `${job} · ${source || "neue Bewerbung"}`
    return await sendMail(
      {
        to,
        subject: `Neue Bewerbung: ${name} für ${job}`,
        html: shell("Revetly", body, { preheader, footerNote: SETTINGS_NOTE }),
      },
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
            .map((r, i, all) => {
              const name = one(r.candidate)?.full_name || "Eine Person"
              const source = SOURCE_SHORT[r.source ?? ""] ?? ""
              // Gleicher Abstand über und unter jeder Trennlinie.
              const pad = `padding:${i ? 12 : 0}px 0 ${i < all.length - 1 ? 12 : 0}px;`
              const rule = i < all.length - 1 ? `border-bottom:1px solid ${MAIL.line};` : ""
              return `<tr>
                <td width="34" valign="middle" style="${pad}${rule}">${avatar(name, 34)}</td>
                <td valign="middle" style="${pad}padding-left:12px;padding-right:10px;${rule}">
                  <div style="font-size:15px;font-weight:700;color:${MAIL.ink};">${escapeHtml(name)}</div>
                  ${source ? `<div style="font-size:12px;color:${MAIL.faint};">${source}</div>` : ""}
                </td>
                <td valign="middle" align="right" style="${pad}white-space:nowrap;${rule}">${scoreCell(r.match_score, r.status, "sm")}</td>
              </tr>`
            })
            .join("")
          return `
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 10px;"><tr>
              <td><a href="${absoluteUrl(`/jobs/${jobId}`)}" style="font-size:16px;font-weight:800;letter-spacing:-0.01em;color:${MAIL.ink};text-decoration:none;">${escapeHtml(title)}</a></td>
              <td align="right"><span style="display:inline-block;padding:3px 10px;border-radius:999px;background:#DDF6EA;font-size:12px;font-weight:800;color:${MAIL.greenDeep};">${list.length} neu</span></td>
            </tr></table>
            ${panel(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${items}</table>`)}
          `
        })
        .join("")

      const count = rows.length
      const jobs = byJob.size
      const best = rows.reduce<number | null>((m, r) => (r.match_score != null && (m == null || r.match_score > m) ? r.match_score : m), null)
      const body = `
        ${eyebrow("Tägliche Zusammenfassung")}
        ${heading(count === 1 ? "Eine neue Bewerbung seit gestern" : `${count} neue Bewerbungen seit gestern`)}
        ${paragraph(`Verteilt auf ${jobs === 1 ? "eine Stelle" : `${jobs} Stellen`}, innerhalb jeder Stelle nach Match sortiert.`, { muted: true })}
        ${sections}
        ${button(absoluteUrl("/dashboard"), "Zum Dashboard")}
      `
      const ok = await sendMail(
        {
          to,
          subject: count === 1 ? "1 neue Bewerbung seit gestern" : `${count} neue Bewerbungen seit gestern`,
          html: shell("Revetly", body, {
            preheader: best != null ? `Bester Match: ${best} · ${jobs === 1 ? "1 Stelle" : `${jobs} Stellen`}` : `${jobs === 1 ? "1 Stelle" : `${jobs} Stellen`}`,
            footerNote: SETTINGS_NOTE,
          }),
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
