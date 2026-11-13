import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js"

import { isAdminEmail } from "./access"

// ─────────────────────────────────────────────────────────────────────────────
// Kennzahlen für das Admin-Dashboard aus der Datenbank (Service-Rolle).
//
// Eigene Test- und Firmenkonten zählen nicht mit: alle Adressen unter
// @revetly.ai und die Adressen in ADMIN_EXCLUDE_EMAILS (kommagetrennt).
// Jede Abfrage ist für sich abgesichert: Fehlt eine Tabelle (Migration nicht
// eingespielt), bleibt der Wert leer, statt das Dashboard zu brechen.
// ─────────────────────────────────────────────────────────────────────────────

const DAY = 86_400_000
const PAID = new Set(["starter", "growth", "pro", "enterprise"])
const PLAN_ORDER = ["free", "starter", "growth", "pro", "enterprise"] as const

export function excludedEmail(email: string | null | undefined, extra = process.env.ADMIN_EXCLUDE_EMAILS): boolean {
  if (!email) return false
  const e = email.trim().toLowerCase()
  if (e.endsWith("@revetly.ai") || isAdminEmail(e)) return true
  return (extra ?? "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)
    .includes(e)
}

export function adminDb(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

/** Montag 00:00 UTC der Woche, in der `d` liegt. */
export function weekStart(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dow = (x.getUTCDay() + 6) % 7
  return new Date(x.getTime() - dow * DAY)
}

/** Anzahl je Woche für die letzten `weeks` Wochen, älteste zuerst. */
export function countPerWeek(dates: Date[], now: Date, weeks = 12): { week: string; count: number }[] {
  const current = weekStart(now).getTime()
  const buckets = Array.from({ length: weeks }, (_, i) => ({ start: current - (weeks - 1 - i) * 7 * DAY, count: 0 }))
  for (const d of dates) {
    const w = weekStart(d).getTime()
    const b = buckets.find((x) => x.start === w)
    if (b) b.count++
  }
  return buckets.map((b) => ({
    week: new Date(b.start).toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit", timeZone: "UTC" }),
    count: b.count,
  }))
}

async function allUsers(db: SupabaseClient): Promise<User[]> {
  const users: User[] = []
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    users.push(...data.users)
    if (data.users.length < 1000) break
  }
  return users
}

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[admin] ${label} übersprungen:`, err instanceof Error ? err.message : err)
    return fallback
  }
}

/** Zeilen einer Tabelle, optional nur ab einem Zeitpunkt. Wirft bei Fehlern (safe fängt sie). */
async function rows<T>(db: SupabaseClient, table: string, columns: string, since?: { column: string; iso: string }): Promise<T[]> {
  const base = db.from(table).select(columns)
  const { data, error } = await (since ? base.gte(since.column, since.iso) : base).limit(50_000)
  if (error) throw new Error(`${table}: ${error.message}`)
  return (data ?? []) as T[]
}

export interface CustomerRow {
  id: string
  email: string
  company: string | null
  plan: string
  registeredAt: string
  lastSignInAt: string | null
  lastActivityAt: string | null
  matchesThisMonth: number
  activeJobs: number
  candidates: number
  teamMembers: number
  stripeCustomerId: string | null
}

export interface DbMetrics {
  generatedAt: string
  users: { total: number; new7: number; new30: number; teamMembers: number; excluded: number }
  accounts: { total: number; paying: number; conversion: number | null; byPlan: { plan: string; count: number }[] }
  active: { d7: number; d30: number }
  signupsPerWeek: { week: string; count: number }[]
  waitlist: { confirmed: number; pending: number; confirmedLast7: number } | null
  usage: {
    activeJobs: number | null
    candidates30: number | null
    bySource: { source: string; count: number }[]
    matchesThisMonth: number | null
    calendars: number | null
    bookings30: number | null
  }
  ops: {
    errors7: number | null
    topErrors: { message: string; count: number }[]
    matchingErrorRate30: number | null
    matchingErrors30: number | null
    cacheEntries: number | null
    cacheHits: number | null
    inbound30: { status: string; count: number }[]
  }
  customers: CustomerRow[]
  /** Stripe-Kunden-IDs der ausgeblendeten Konten, damit Stripe-Zahlen sie auch weglassen. */
  excludedStripeCustomers: string[]
}

const SOURCE_LABEL: Record<string, string> = { manual: "Manuell", public_page: "Stellenseite", email: "E-Mail" }
const INBOUND_LABEL: Record<string, string> = {
  received: "Empfangen",
  processed: "Verarbeitet",
  assigned: "Zugeordnet",
  unassigned: "Nicht zugeordnet",
  no_cv: "Kein Lebenslauf",
  error: "Fehler",
}

export async function loadDbMetrics(now = new Date()): Promise<DbMetrics | null> {
  const db = adminDb()
  if (!db) return null
  const since7 = new Date(now.getTime() - 7 * DAY)
  const since30 = new Date(now.getTime() - 30 * DAY)
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10)

  const users = await safe("Nutzer", () => allUsers(db), [] as User[])
  const excludedIds = new Set(users.filter((u) => excludedEmail(u.email)).map((u) => u.id))
  const counted = users.filter((u) => !excludedIds.has(u.id))

  const members = await safe("Teammitglieder", () => rows<{ member_id: string; owner_id: string }>(db, "workspace_members", "member_id, owner_id"), [])
  const memberIds = new Set(members.map((m) => m.member_id))
  const owners = counted.filter((u) => !memberIds.has(u.id))

  const profiles = await safe(
    "Profile",
    () => rows<{ id: string; plan: string | null; company_name: string | null; matches_used: number | null; matches_period_start: string | null; stripe_customer_id: string | null }>(
      db, "user_profiles", "id, plan, company_name, matches_used, matches_period_start, stripe_customer_id",
    ),
    [],
  )
  const profileOf = new Map(profiles.map((p) => [p.id, p]))
  const planOf = (id: string) => (profileOf.get(id)?.plan ?? "free").toLowerCase()

  const jobs = await safe("Stellen", () => rows<{ user_id: string; is_active: boolean | null; updated_at: string | null }>(db, "jobs", "user_id, is_active, updated_at"), [])
  const links = await safe(
    "Bewerbungen",
    () => rows<{ user_id: string | null; created_at: string; status: string | null; source: string | null }>(db, "job_candidates", "user_id, created_at, status, source"),
    [],
  )
  const countedJobs = jobs.filter((j) => !excludedIds.has(j.user_id))
  const countedLinks = links.filter((l) => l.user_id && !excludedIds.has(l.user_id))

  // Letzte Aktivität: Anmeldung, neue Bewerbung oder geänderte Stelle. Die
  // Anmeldung allein reicht nicht, weil Sitzungen lange gültig bleiben.
  const lastActivity = new Map<string, number>()
  const bump = (id: string | null | undefined, iso: string | null | undefined) => {
    if (!id || !iso) return
    const t = new Date(iso).getTime()
    if (t > (lastActivity.get(id) ?? 0)) lastActivity.set(id, t)
  }
  for (const u of counted) bump(u.id, u.last_sign_in_at)
  for (const j of countedJobs) bump(j.user_id, j.updated_at)
  for (const l of countedLinks) bump(l.user_id, l.created_at)
  const activeSince = (since: Date) => counted.filter((u) => (lastActivity.get(u.id) ?? 0) >= since.getTime()).length

  const byPlanMap = new Map<string, number>()
  for (const o of owners) byPlanMap.set(planOf(o.id), (byPlanMap.get(planOf(o.id)) ?? 0) + 1)
  const paying = owners.filter((o) => PAID.has(planOf(o.id))).length

  const waitlist = await safe(
    "Warteliste",
    async () => {
      const w = await rows<{ status: string; confirmed_at: string | null }>(db, "waitlist", "status, confirmed_at")
      return {
        confirmed: w.filter((x) => x.status === "confirmed").length,
        pending: w.filter((x) => x.status === "pending").length,
        confirmedLast7: w.filter((x) => x.confirmed_at && new Date(x.confirmed_at) >= since7).length,
      }
    },
    null,
  )

  const recentLinks = countedLinks.filter((l) => new Date(l.created_at) >= since30)
  const sourceMap = new Map<string, number>()
  for (const l of recentLinks) {
    const s = SOURCE_LABEL[l.source ?? "manual"] ?? l.source ?? "Manuell"
    sourceMap.set(s, (sourceMap.get(s) ?? 0) + 1)
  }
  const scoredOrError = recentLinks.filter((l) => l.status && l.status !== "queued" && l.status !== "analyzing" && l.status !== "new")
  const errors30 = recentLinks.filter((l) => l.status === "error").length

  const calendars = await safe("Kalender", async () => (await rows<{ user_id: string }>(db, "calendar_accounts", "user_id")).filter((c) => !excludedIds.has(c.user_id)).length, null)
  const bookings30 = await safe(
    "Termine",
    async () => (await rows<{ user_id: string; created_at: string }>(db, "bookings", "user_id, created_at")).filter((b) => !excludedIds.has(b.user_id) && new Date(b.created_at) >= since30).length,
    null,
  )

  const errorEvents = await safe(
    "Fehler",
    () => rows<{ message: string; level: string; created_at: string }>(db, "error_events", "message, level, created_at", { column: "created_at", iso: since7.toISOString() }),
    null,
  )
  const errorList = errorEvents?.filter((e) => e.level === "error") ?? null
  const topErrorMap = new Map<string, number>()
  for (const e of errorList ?? []) {
    const m = e.message.slice(0, 120)
    topErrorMap.set(m, (topErrorMap.get(m) ?? 0) + 1)
  }

  const cache = await safe("Cache", () => rows<{ hits: number }>(db, "match_cache", "hits"), null)
  const inbound = await safe(
    "Mail-Eingang",
    () => rows<{ status: string; user_id: string | null; created_at: string }>(db, "inbound_emails", "status, user_id, created_at", { column: "created_at", iso: since30.toISOString() }),
    [],
  )
  const inboundMap = new Map<string, number>()
  for (const i of inbound.filter((x) => !x.user_id || !excludedIds.has(x.user_id))) {
    const s = INBOUND_LABEL[i.status] ?? i.status
    inboundMap.set(s, (inboundMap.get(s) ?? 0) + 1)
  }

  const matchesThisMonth = (id: string) => {
    const p = profileOf.get(id)
    return p?.matches_period_start && p.matches_period_start >= monthStart ? (p.matches_used ?? 0) : 0
  }
  const teamOf = new Map<string, number>()
  for (const m of members) teamOf.set(m.owner_id, (teamOf.get(m.owner_id) ?? 0) + 1)
  const activeJobsOf = new Map<string, number>()
  for (const j of countedJobs) if (j.is_active) activeJobsOf.set(j.user_id, (activeJobsOf.get(j.user_id) ?? 0) + 1)
  const candidatesOf = new Map<string, number>()
  for (const l of countedLinks) candidatesOf.set(l.user_id!, (candidatesOf.get(l.user_id!) ?? 0) + 1)

  const customers: CustomerRow[] = owners
    .map((o) => {
      const last = lastActivity.get(o.id)
      return {
        id: o.id,
        email: o.email ?? "",
        company: profileOf.get(o.id)?.company_name ?? null,
        plan: planOf(o.id),
        registeredAt: o.created_at,
        lastSignInAt: o.last_sign_in_at ?? null,
        lastActivityAt: last ? new Date(last).toISOString() : null,
        matchesThisMonth: matchesThisMonth(o.id),
        activeJobs: activeJobsOf.get(o.id) ?? 0,
        candidates: candidatesOf.get(o.id) ?? 0,
        teamMembers: teamOf.get(o.id) ?? 0,
        stripeCustomerId: profileOf.get(o.id)?.stripe_customer_id ?? null,
      }
    })
    .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt))

  return {
    generatedAt: now.toISOString(),
    users: {
      total: counted.length,
      new7: counted.filter((u) => new Date(u.created_at) >= since7).length,
      new30: counted.filter((u) => new Date(u.created_at) >= since30).length,
      teamMembers: counted.filter((u) => memberIds.has(u.id)).length,
      excluded: excludedIds.size,
    },
    accounts: {
      total: owners.length,
      paying,
      conversion: owners.length ? paying / owners.length : null,
      byPlan: [...byPlanMap.entries()]
        .map(([plan, count]) => ({ plan, count }))
        .sort((a, b) => PLAN_ORDER.indexOf(a.plan as never) - PLAN_ORDER.indexOf(b.plan as never)),
    },
    active: { d7: activeSince(since7), d30: activeSince(since30) },
    signupsPerWeek: countPerWeek(counted.map((u) => new Date(u.created_at)), now),
    waitlist,
    usage: {
      activeJobs: countedJobs.filter((j) => j.is_active).length,
      candidates30: recentLinks.length,
      bySource: [...sourceMap.entries()].map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count),
      matchesThisMonth: owners.reduce((s, o) => s + matchesThisMonth(o.id), 0),
      calendars,
      bookings30,
    },
    ops: {
      errors7: errorList?.length ?? null,
      topErrors: [...topErrorMap.entries()].map(([message, count]) => ({ message, count })).sort((a, b) => b.count - a.count).slice(0, 3),
      matchingErrorRate30: scoredOrError.length ? errors30 / scoredOrError.length : null,
      matchingErrors30: errors30,
      cacheEntries: cache?.length ?? null,
      cacheHits: cache ? cache.reduce((s, c) => s + (c.hits ?? 0), 0) : null,
      inbound30: [...inboundMap.entries()].map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count),
    },
    customers,
    excludedStripeCustomers: profiles.filter((p) => excludedIds.has(p.id) && p.stripe_customer_id).map((p) => p.stripe_customer_id!),
  }
}
