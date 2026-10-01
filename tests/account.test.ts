import type { SupabaseClient } from "@supabase/supabase-js"
import { describe, expect, it } from "vitest"

import { deleteAccount, stripSecrets } from "@/lib/account/data"

/**
 * Nachgebauter Supabase-Client: schreibt jede Löschung mit, damit sich
 * Reihenfolge und Abbruch prüfen lassen.
 */
function fakeDb(opts: { customerId: string | null; files?: Record<string, string[]> }) {
  const deleted: string[] = []
  const query = (table: string) => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      single: async () => ({ data: table === "user_profiles" ? { stripe_customer_id: opts.customerId } : null, error: null }),
      delete: () => ({ eq: async () => { deleted.push(`tabelle:${table}`); return { error: null } } }),
    }
    return chain
  }
  const storage = {
    from: (bucket: string) => ({
      list: async (prefix: string) => ({
        data: prefix.includes("/") ? [] : (opts.files?.[bucket] ?? []).map((name) => ({ name, id: "x" })),
        error: null,
      }),
      remove: async (paths: string[]) => { deleted.push(`dateien:${bucket}:${paths.length}`); return { error: null } },
    }),
  }
  const auth = { admin: { deleteUser: async () => { deleted.push("konto"); return { error: null } } } }
  return { db: { from: query, storage, auth } as unknown as SupabaseClient, deleted }
}

describe("deleteAccount", () => {
  it("löscht nichts, wenn die Abo-Kündigung scheitert", async () => {
    const { db, deleted } = fakeDb({ customerId: "cus_1", files: { resumes: ["cv.pdf"] } })
    const r = await deleteAccount(db, "u1", async () => { throw new Error("Stripe nicht erreichbar") })
    expect(r).toMatchObject({ ok: false, status: 502 })
    expect(deleted).toEqual([])
  })

  it("kündigt zuerst und löscht dann Dateien, Tabellen und Konto in dieser Reihenfolge", async () => {
    const { db, deleted } = fakeDb({ customerId: "cus_1", files: { resumes: ["c1.pdf"], "candidate-photos": ["c1.png"] } })
    let cancelled = ""
    const r = await deleteAccount(db, "u1", async (id) => { cancelled = id })
    expect(r).toEqual({ ok: true })
    expect(cancelled).toBe("cus_1")
    expect(deleted).toEqual([
      "dateien:resumes:1",
      "dateien:candidate-photos:1",
      "tabelle:job_candidates",
      "tabelle:candidates",
      "tabelle:jobs",
      "tabelle:user_profiles",
      "konto",
    ])
  })

  it("braucht ohne Stripe-Kunde keine Kündigung", async () => {
    const { db, deleted } = fakeDb({ customerId: null })
    let called = false
    const r = await deleteAccount(db, "u1", async () => { called = true })
    expect(r).toEqual({ ok: true })
    expect(called).toBe(false)
    expect(deleted.at(-1)).toBe("konto")
  })
})

describe("stripSecrets", () => {
  it("entfernt Tokens und Prüfwerte, behält den Rest", () => {
    expect(stripSecrets({ id: 1, access_token: "a", refresh_token: "b", token_hash: "c", account_email: "x@y.at" }))
      .toEqual({ id: 1, account_email: "x@y.at" })
  })
})
