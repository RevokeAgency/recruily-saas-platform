import { createHash, randomBytes } from "node:crypto"
import { createClient as createAdmin, type SupabaseClient } from "@supabase/supabase-js"

import { toCandidateView, type ReviewPageData } from "./shared"

// ─────────────────────────────────────────────────────────────────────────────
// Freigabe-Link: Zugriff auf die Datenbank (nur Server, service_role).
//
// Der Link enthält 32 zufällige Bytes. Gespeichert wird nur der SHA-256-
// Abdruck, wie bei den Buchungslinks: Wer die Datenbank liest, kann damit
// keinen Link nachbauen.
// ─────────────────────────────────────────────────────────────────────────────

export function reviewDb(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createAdmin(url, key, { auth: { persistSession: false } })
}

export function createReviewToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url")
  return { token, hash: hashReviewToken(token) }
}

export function hashReviewToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

/** Ein Token hat genau die Form, die createReviewToken erzeugt. Alles andere wird gar nicht erst gesucht. */
export function plausibleToken(token: unknown): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token)
}

export type ReviewLinkRow = {
  id: string
  user_id: string
  job_id: string
  reviewer_name: string | null
  reviewer_email: string | null
  note: string | null
  expires_at: string
  revoked_at: string | null
  first_opened_at: string | null
  completed_at: string | null
}

/** Link zum Token, oder warum es keinen gültigen gibt. */
export async function findLink(
  db: SupabaseClient,
  token: string,
): Promise<{ ok: true; link: ReviewLinkRow } | { ok: false; status: "expired" | "revoked" | "not_found" }> {
  if (!plausibleToken(token)) return { ok: false, status: "not_found" }
  const { data } = await db
    .from("review_links")
    .select("id, user_id, job_id, reviewer_name, reviewer_email, note, expires_at, revoked_at, first_opened_at, completed_at")
    .eq("token_hash", hashReviewToken(token))
    .maybeSingle()
  if (!data) return { ok: false, status: "not_found" }
  const link = data as ReviewLinkRow
  if (link.revoked_at) return { ok: false, status: "revoked" }
  if (new Date(link.expires_at).getTime() <= Date.now()) return { ok: false, status: "expired" }
  return { ok: true, link }
}

export const ITEM_SELECT =
  "id, verdict, comment, decided_at, position, job_candidate:job_candidates(" +
  "id, match_score, knockout, knockout_reasons, ai_summary, match_detail, " +
  "candidate:candidates(full_name, job_title, location, years_of_experience, skills, summary_ai, resume_path))"

/** Anzeigename von HR für Mail und Freigabeseite. */
export async function senderOf(db: SupabaseClient, userId: string): Promise<{ name: string; company: string | null; email: string | null }> {
  const { data: profile } = await db.from("user_profiles").select("*").eq("id", userId).maybeSingle()
  const p = (profile ?? {}) as Record<string, unknown>
  const full = [p.first_name, p.last_name].filter((x) => typeof x === "string" && x.trim()).join(" ").trim()
  let email: string | null = null
  try {
    const { data } = await db.auth.admin.getUserById(userId)
    email = data?.user?.email ?? null
  } catch {
    email = null
  }
  const company = typeof p.company_name === "string" && p.company_name.trim() ? p.company_name.trim() : null
  return { name: full || company || "Dein Recruiting-Team", company, email }
}

/** Alles, was die Freigabeseite braucht. Merkt sich das erste Öffnen. */
export async function loadReviewPage(db: SupabaseClient, token: string): Promise<ReviewPageData> {
  const found = await findLink(db, token)
  if (!found.ok) return { status: found.status }
  const { link } = found

  const [{ data: job }, { data: items }, sender] = await Promise.all([
    db.from("jobs").select("title, company, location").eq("id", link.job_id).maybeSingle(),
    db.from("review_link_items").select(ITEM_SELECT).eq("link_id", link.id).order("position"),
    senderOf(db, link.user_id),
  ])
  if (!job) return { status: "not_found" }

  if (!link.first_opened_at) {
    await db.from("review_links").update({ first_opened_at: new Date().toISOString() }).eq("id", link.id)
  }

  return {
    status: "ok",
    jobTitle: (job.title as string) || "Stelle",
    company: (job.company as string) || sender.company || "",
    jobLocation: (job.location as string | null) ?? null,
    reviewerName: link.reviewer_name,
    senderName: sender.name,
    note: link.note,
    expiresAt: link.expires_at,
    candidates: ((items ?? []) as unknown as Record<string, unknown>[])
      // Gelöschte Bewerbungen fallen über die Fremdschlüssel weg; ein Eintrag
      // ohne Bewerbung bleibt trotzdem nie stehen.
      .filter((i) => i.job_candidate)
      .map(toCandidateView),
  }
}
