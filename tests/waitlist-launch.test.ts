import { beforeEach, describe, expect, it, vi } from "vitest"

import { waitlistLaunchMail } from "@/lib/email/waitlist"
import { PLANS } from "@/lib/plans"
import { sendLaunchBatch } from "@/lib/waitlist/store"

const sendMock = vi.fn<(opts: { to: string; unsubscribeUrl: string }) => Promise<boolean>>()
vi.mock("@/lib/email/waitlist", async (orig) => ({
  ...(await orig<typeof import("@/lib/email/waitlist")>()),
  sendWaitlistLaunch: (opts: { to: string; unsubscribeUrl: string }) => sendMock(opts),
}))

// Der Schlüssel wird erst beim Signieren gelesen, nicht beim Import.
process.env.WAITLIST_SECRET = "test-secret"

type Row = { id: string; email: string; status: string }

// Kleine Attrappe des Supabase-Clients: genau die Aufrufe, die der Versand braucht.
function fakeDb(rows: Row[]) {
  return {
    rows,
    from() {
      return {
        select: (_cols: string, opts?: { head?: boolean }) => {
          const filter: Record<string, string> = {}
          const q = {
            eq: (k: string, v: string) => ((filter[k] = v), q),
            order: () => q,
            limit: (n: number) =>
              Promise.resolve({ data: rows.filter((r) => r.status === filter.status).slice(0, n), error: null }),
            then: (res: (v: unknown) => void) =>
              res(opts?.head ? { count: rows.filter((r) => r.status === filter.status).length, error: null } : { data: [], error: null }),
          }
          return q
        },
        delete: () => ({
          eq: (_k: string, id: string) => {
            const i = rows.findIndex((r) => r.id === id)
            if (i >= 0) rows.splice(i, 1)
            return Promise.resolve({ error: null })
          },
        }),
      }
    },
  }
}

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`

describe("Mail zum Start", () => {
  beforeEach(() => sendMock.mockReset())

  it("verschickt an Bestätigte und löscht jede Adresse danach", async () => {
    sendMock.mockResolvedValue(true)
    const db = fakeDb([
      { id: id(1), email: "a@x.at", status: "confirmed" },
      { id: id(2), email: "b@x.at", status: "confirmed" },
      { id: id(3), email: "c@x.at", status: "pending" },
    ])
    const r = await sendLaunchBatch(db as never)
    expect(r).toEqual({ sent: 2, failed: 0, remaining: 0, stopped: false })
    expect(db.rows.map((x) => x.email)).toEqual(["c@x.at"])
    expect(sendMock.mock.calls[0][0].unsubscribeUrl).toContain(`/warteliste/abmelden/${id(1)}.`)
  })

  it("behält Adressen bei Fehlern und bricht nach drei Fehlern in Folge ab", async () => {
    sendMock.mockResolvedValue(false)
    const db = fakeDb([1, 2, 3, 4, 5].map((n) => ({ id: id(n), email: `${n}@x.at`, status: "confirmed" })))
    const r = await sendLaunchBatch(db as never)
    expect(r).toMatchObject({ sent: 0, failed: 3, remaining: 5, stopped: true })
    expect(sendMock).toHaveBeenCalledTimes(3)
  })

  it("Mail enthält Startlink, Austragelink und das Kontingent aus PLANS", () => {
    const { subject, html } = waitlistLaunchMail("https://www.revetly.ai/warteliste/abmelden/abc")
    expect(subject).toBe("Revetly ist da")
    expect(html).toContain("/auth/register")
    expect(html).toContain("/warteliste/abmelden/abc")
    expect(html).toContain(`${PLANS.free.matches} Matches gratis`)
  })
})
