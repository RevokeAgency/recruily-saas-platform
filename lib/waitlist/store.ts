import { createClient as createAdmin, type SupabaseClient } from "@supabase/supabase-js"

import { notifyWaitlistSignup, sendWaitlistConfirm, sendWaitlistLaunch, sendWaitlistWelcome } from "@/lib/email/waitlist"
import { absoluteUrl } from "@/lib/site"

import {
  CONFIRM_TTL_MS,
  WAITLIST_CONSENT_VERSION,
  createConfirmToken,
  hashConfirmToken,
  plausibleConfirmToken,
  unsubscribeToken,
  verifyUnsubscribeToken,
} from "./token"

// ─────────────────────────────────────────────────────────────────────────────
// Warteliste: Datenbank (nur Server, service_role, Tabelle aus Migration 037).
// ─────────────────────────────────────────────────────────────────────────────

export function waitlistDb(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createAdmin(url, key, { auth: { persistSession: false } })
}

export const confirmUrl = (token: string) => absoluteUrl(`/warteliste/bestaetigen/${token}`)
export const unsubscribeUrl = (id: string) => absoluteUrl(`/warteliste/abmelden/${unsubscribeToken(id)}`)

/**
 * Trägt eine Adresse vorläufig ein und schickt den Bestätigungslink. Wer
 * schon bestätigt ist, bekommt keine weitere Mail. Ein erneuter Versuch vor
 * dem Bestätigen erneuert den Link.
 */
export async function requestSignup(
  db: SupabaseClient,
  email: string,
  source: string | null,
): Promise<"sent" | "already" | "failed"> {
  // Abgelaufene, nie bestätigte Einträge gehen weg (Datensparsamkeit).
  await db.from("waitlist").delete().eq("status", "pending").lt("confirm_expires_at", new Date().toISOString())

  const { data: existing, error: readError } = await db
    .from("waitlist")
    .select("id, status")
    .eq("email", email)
    .maybeSingle()
  if (readError) {
    console.error("[waitlist] lesen fehlgeschlagen:", readError.message)
    return "failed"
  }
  if (existing?.status === "confirmed") return "already"

  const { token, hash } = createConfirmToken()
  const row = {
    confirm_token_hash: hash,
    confirm_expires_at: new Date(Date.now() + CONFIRM_TTL_MS).toISOString(),
    consent_version: WAITLIST_CONSENT_VERSION,
    source,
    requested_at: new Date().toISOString(),
  }
  const { error } = existing
    ? await db.from("waitlist").update(row).eq("id", existing.id).eq("status", "pending")
    : await db.from("waitlist").insert({ email, status: "pending", ...row })
  if (error) {
    console.error("[waitlist] speichern fehlgeschlagen:", error.message)
    return "failed"
  }

  return (await sendWaitlistConfirm({ to: email, confirmUrl: confirmUrl(token) })) ? "sent" : "failed"
}

export type ConfirmResult = "confirmed" | "already" | "expired" | "invalid"

export async function confirmSignup(db: SupabaseClient, token: unknown): Promise<ConfirmResult> {
  if (!plausibleConfirmToken(token)) return "invalid"
  const { data } = await db
    .from("waitlist")
    .select("id, email, status, confirm_expires_at")
    .eq("confirm_token_hash", hashConfirmToken(token))
    .maybeSingle()
  if (!data) return "invalid"
  if (data.status === "confirmed") return "already"
  if (!data.confirm_expires_at || new Date(data.confirm_expires_at).getTime() <= Date.now()) return "expired"

  const { data: updated, error } = await db
    .from("waitlist")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString(), confirm_expires_at: null })
    .eq("id", data.id)
    .eq("status", "pending")
    .select("id")
  if (error) {
    console.error("[waitlist] bestätigen fehlgeschlagen:", error.message)
    return "invalid"
  }
  // Zwei Klicks gleichzeitig: Nur der erste verschickt Mails.
  if (!updated?.length) return "already"

  await sendWaitlistWelcome({ to: data.email, unsubscribeUrl: unsubscribeUrl(data.id) })
  const { count } = await db.from("waitlist").select("id", { count: "exact", head: true }).eq("status", "confirmed")
  await notifyWaitlistSignup(data.email, count ?? null)
  return "confirmed"
}

/** Löscht den Eintrag. Idempotent: Ein zweiter Klick meldet ebenfalls Erfolg. */
export async function unsubscribe(db: SupabaseClient, token: unknown): Promise<"done" | "invalid"> {
  const id = verifyUnsubscribeToken(token)
  if (!id) return "invalid"
  const { error } = await db.from("waitlist").delete().eq("id", id)
  if (error) {
    console.error("[waitlist] austragen fehlgeschlagen:", error.message)
    return "invalid"
  }
  return "done"
}

// ─────────────────────────────────────────────────────────────────────────────
// Zum Start (Admin-Seite /admin/warteliste)
// ─────────────────────────────────────────────────────────────────────────────

export async function waitlistStats(db: SupabaseClient): Promise<{ confirmed: number; pending: number } | null> {
  const count = async (status: string) => {
    const { count, error } = await db.from("waitlist").select("id", { count: "exact", head: true }).eq("status", status)
    return error ? null : (count ?? 0)
  }
  const [confirmed, pending] = await Promise.all([count("confirmed"), count("pending")])
  return confirmed === null || pending === null ? null : { confirmed, pending }
}

/**
 * Schickt die Mail zum Start an bis zu `limit` bestätigte Adressen und
 * löscht jede Adresse, sobald ihre Mail angenommen wurde. Ein abgebrochener
 * Versand lässt sich deshalb einfach fortsetzen: Wer noch in der Tabelle
 * steht, hat die Mail noch nicht. Nach drei Fehlern in Folge bricht der
 * Durchgang ab (meist Kontingent oder Zugang beim Mailanbieter).
 */
export async function sendLaunchBatch(
  db: SupabaseClient,
  limit = 25,
): Promise<{ sent: number; failed: number; remaining: number; stopped: boolean }> {
  const { data, error } = await db
    .from("waitlist")
    .select("id, email")
    .eq("status", "confirmed")
    .order("confirmed_at", { ascending: true })
    .limit(limit)
  if (error) throw new Error(`waitlist lesen: ${error.message}`)

  let sent = 0
  let failed = 0
  let streak = 0
  for (const row of data ?? []) {
    const ok = await sendWaitlistLaunch({ to: row.email, unsubscribeUrl: unsubscribeUrl(row.id) })
    if (ok) {
      sent++
      streak = 0
      // Lässt sich die Adresse nicht löschen, sofort abbrechen: Sonst bekäme
      // sie beim nächsten Durchgang dieselbe Mail ein zweites Mal.
      const { error: delError } = await db.from("waitlist").delete().eq("id", row.id)
      if (delError) throw new Error(`waitlist löschen nach Versand: ${delError.message}`)
    } else {
      failed++
      if (++streak >= 3) break
    }
  }

  const stats = await waitlistStats(db)
  return { sent, failed, remaining: stats?.confirmed ?? 0, stopped: streak >= 3 }
}

/** Löscht alle unbestätigten Einträge, etwa nach dem Versand zum Start. */
export async function purgePending(db: SupabaseClient): Promise<number> {
  const { data, error } = await db.from("waitlist").delete().eq("status", "pending").select("id")
  if (error) throw new Error(`waitlist löschen: ${error.message}`)
  return data?.length ?? 0
}
