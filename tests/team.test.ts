import { readFileSync } from "node:fs"
import type Stripe from "stripe"
import { describe, expect, it } from "vitest"

import { PLANS, PLAN_ORDER, canBuyExtraSeats, maxExtraSeats, seatLimit } from "@/lib/plans"
import { planItem, seatItem, subLookupKey, subSeatQuantity } from "@/lib/stripe/server"
import { profileUpdateFor } from "@/lib/stripe/sync"
import {
  acceptBlock,
  hasFreeSeat,
  inviteState,
  normalizeEmail,
  personName,
  plausibleInviteToken,
  seatState,
  type AcceptCheck,
} from "@/lib/team/model"
import { getWorkspace, requireOwner } from "@/lib/workspace"

const SQL_035 = readFileSync("scripts/035_team.sql", "utf8")
const SQL_028 = readFileSync("scripts/028_free_trial_lifetime.sql", "utf8")

describe("Plätze pro Plan", () => {
  it("1 / 2 / 5 / unbegrenzt, Zusatzplätze nur bei Starter und Growth", () => {
    expect(seatLimit("free")).toBe(1)
    expect(seatLimit("starter")).toBe(2)
    expect(seatLimit("growth", 3)).toBe(8)
    expect(seatLimit("pro", 3)).toBeNull()
    expect(seatLimit("enterprise")).toBeNull()
    expect(seatLimit("free", 4)).toBe(1)
    expect(canBuyExtraSeats("starter")).toBe(true)
    expect(canBuyExtraSeats("free")).toBe(false)
    expect(canBuyExtraSeats("pro")).toBe(false)
  })

  it("stimmen mit plan_seat_limit in Migration 035 überein", () => {
    const fn = SQL_035.slice(SQL_035.indexOf("function public.plan_seat_limit"))
    for (const plan of PLAN_ORDER) {
      const m = fn.match(new RegExp(`when '${plan}'\\s+then (\\d+)`))
      const seats = PLANS[plan].seats
      if (seats === null) expect(m, plan).toBeNull()
      else expect(Number(m?.[1]), plan).toBe(seats)
    }
  })

  it("Starter höchstens 2 Zusatzplätze, wie plan_extra_seat_max in Migration 035", () => {
    expect(maxExtraSeats("starter")).toBe(2)
    expect(seatLimit("starter", 5)).toBe(4)
    expect(maxExtraSeats("pro")).toBe(0)
    const fn = SQL_035.slice(SQL_035.indexOf("function public.plan_extra_seat_max"))
    for (const plan of PLAN_ORDER) {
      const m = fn.match(new RegExp(`when '${plan}'\\s+then (\\d+)`))
      expect(m ? Number(m[1]) : 0, plan).toBe(maxExtraSeats(plan))
    }
  })

  it("zählt Inhaber, Mitglieder und offene Einladungen", () => {
    expect(seatState(5, 2, 1)).toEqual({ limit: 5, used: 4, free: 1 })
    expect(hasFreeSeat(seatState(2, 1, 0))).toBe(false)
    expect(hasFreeSeat(seatState(null, 40, 3))).toBe(true)
    expect(seatState(2, 3, 0).free).toBe(0)
  })
})

describe("Migration 035", () => {
  it("übernimmt die Kontingent-Funktionen aus 028 wortgleich bis auf die Prüfung", () => {
    for (const name of ["consume_match", "match_usage", "job_quota"]) {
      const body = (sql: string) => {
        const i = sql.indexOf(`create or replace function public.${name}(`)
        return sql.slice(i, sql.indexOf("$$;", i))
      }
      expect(body(SQL_035).replace("p_user <> public.current_workspace()", "p_user <> auth.uid()"), name).toBe(body(SQL_028))
    }
  })

  it("stellt jede Tabelle mit Kundendaten auf den Arbeitsbereich um", () => {
    for (const table of ["jobs", "candidates", "job_candidates", "inbound_emails", "decision_events", "review_links", "review_link_items"]) {
      expect(SQL_035, table).toMatch(new RegExp(`on public\\.${table}\\n  for select using \\(user_id = \\(select public\\.current_workspace\\(\\)\\)\\)`))
    }
    expect(SQL_035).not.toMatch(/(using|with check) \(user_id = auth\.uid\(\)/)
  })
})

describe("Einladungen", () => {
  it("prüft Adresse und Token", () => {
    expect(normalizeEmail("  Anna.Berger@Firma.AT ")).toBe("anna.berger@firma.at")
    expect(normalizeEmail("keine-adresse")).toBeNull()
    expect(normalizeEmail(42)).toBeNull()
    expect(plausibleInviteToken("a".repeat(43))).toBe(true)
    expect(plausibleInviteToken("a".repeat(42))).toBe(false)
    expect(plausibleInviteToken("../../etc/passwd")).toBe(false)
  })

  it("kennt den Zustand eines Links", () => {
    const now = new Date("2026-10-13T10:00:00Z")
    expect(inviteState(null, now)).toBe("invalid")
    expect(inviteState({ accepted_at: "2026-10-12T00:00:00Z", expires_at: "2026-10-20T00:00:00Z" }, now)).toBe("used")
    expect(inviteState({ accepted_at: null, expires_at: "2026-10-12T00:00:00Z" }, now)).toBe("expired")
    expect(inviteState({ accepted_at: null, expires_at: "2026-10-20T00:00:00Z" }, now)).toBe("open")
  })

  it("zeigt Namen, sonst die Adresse", () => {
    expect(personName("Anna", " Berger ", "a@b.at")).toBe("Anna Berger")
    expect(personName(null, "", "a@b.at")).toBe("a@b.at")
  })
})

describe("Einladung annehmen", () => {
  const base: AcceptCheck = {
    inviteEmail: "anna@firma.at",
    inviteExpiresAt: "2026-10-20T00:00:00Z",
    inviteAcceptedAt: null,
    ownerId: "owner",
    userId: "anna",
    userEmail: "Anna@Firma.at",
    userHasMembers: false,
    userMemberOf: null,
    userPlan: "free",
    teamMembers: 1,
    teamSeatLimit: 5,
    now: new Date("2026-10-13T10:00:00Z"),
  }

  it("lässt die eingeladene Person mit freiem Platz beitreten", () => {
    expect(acceptBlock(base)).toBeNull()
  })

  it("weist ab, was nicht passt", () => {
    expect(acceptBlock({ ...base, inviteAcceptedAt: "2026-10-12T00:00:00Z" })).toBe("used")
    expect(acceptBlock({ ...base, inviteExpiresAt: "2026-10-01T00:00:00Z" })).toBe("expired")
    expect(acceptBlock({ ...base, userId: "owner" })).toBe("own_team")
    expect(acceptBlock({ ...base, userEmail: "jemand@anders.at" })).toBe("wrong_email")
    expect(acceptBlock({ ...base, userMemberOf: "owner" })).toBe("already_member")
    expect(acceptBlock({ ...base, userMemberOf: "fremd" })).toBe("other_team")
    expect(acceptBlock({ ...base, userHasMembers: true })).toBe("has_members")
    expect(acceptBlock({ ...base, userPlan: "growth" })).toBe("paid_plan")
  })

  it("braucht einen freien Platz: Starter hat neben dem Inhaber genau einen", () => {
    expect(acceptBlock({ ...base, teamSeatLimit: 2, teamMembers: 0 })).toBeNull()
    expect(acceptBlock({ ...base, teamSeatLimit: 2, teamMembers: 1 })).toBe("no_seat")
    expect(acceptBlock({ ...base, teamSeatLimit: null, teamMembers: 99 })).toBeNull()
  })
})

describe("Arbeitsbereich", () => {
  const rpc = (data: unknown, error: unknown = null) =>
    ({ rpc: async () => ({ data, error }) }) as unknown as Parameters<typeof getWorkspace>[0]

  it("Mitglieder arbeiten mit den Daten des Inhabers", async () => {
    const ws = await getWorkspace(rpc({ owner_id: "owner", role: "member", active: true }), "me")
    expect(ws).toEqual({ userId: "me", ownerId: "owner", role: "member", active: true, teamOwnerId: "owner" })
  })

  it("gesperrte Mitglieder sehen die Daten des Teams nicht", async () => {
    const ws = await getWorkspace(rpc({ owner_id: "owner", role: "member", active: false }), "me")
    expect(ws.ownerId).toBe("me")
    expect(ws.teamOwnerId).toBe("owner")
  })

  it("ohne Migration 035 ist jede Person ihr eigener Arbeitsbereich", async () => {
    const ws = await getWorkspace(rpc(null, { message: "function my_workspace does not exist" }), "me")
    expect(ws).toEqual({ userId: "me", ownerId: "me", role: "owner", active: true, teamOwnerId: "me" })
  })

  it("Abo und Team ändert nur der Inhaber", async () => {
    const member = await getWorkspace(rpc({ owner_id: "owner", role: "member", active: true }), "me")
    const res = requireOwner(member, "Das Abo verwalten")
    expect(res?.status).toBe(403)
    expect(await res?.json()).toMatchObject({ owner_only: true })
    expect(requireOwner(await getWorkspace(rpc(null), "me"), "x")).toBeNull()
  })
})

describe("Zusatzplätze in Stripe", () => {
  const item = (id: string, lookup: string, quantity = 1) =>
    ({ id, quantity, price: { id: `price_${lookup}`, lookup_key: lookup } }) as unknown as Stripe.SubscriptionItem
  const sub = (...items: Stripe.SubscriptionItem[]) => ({ items: { data: items } }) as unknown as Stripe.Subscription

  it("erkennt Plan und Plätze unabhängig von der Reihenfolge", () => {
    const s = sub(item("si_seat", "revetly_seat_monthly", 3), item("si_plan", "revetly_growth_monthly"))
    expect(planItem(s)?.id).toBe("si_plan")
    expect(seatItem(s)?.id).toBe("si_seat")
    expect(subLookupKey(s)).toBe("revetly_growth_monthly")
    expect(subSeatQuantity(s)).toBe(3)
    expect(subSeatQuantity(sub(item("si_plan", "revetly_starter_yearly")))).toBe(0)
  })

  it("schreibt die Zusatzplätze ins Profil, nur bei Starter und Growth", () => {
    const state = { customerId: "cus", subscriptionId: "sub", status: "active", periodEnd: null }
    expect(profileUpdateFor({ ...state, lookupKey: "revetly_growth_monthly", extraSeats: 3 }).extra_seats).toBe(3)
    expect(profileUpdateFor({ ...state, lookupKey: "revetly_pro_monthly", extraSeats: 3 }).extra_seats).toBe(0)
    expect(profileUpdateFor({ ...state, lookupKey: "revetly_starter_monthly", extraSeats: 5 }).extra_seats).toBe(2)
    expect(profileUpdateFor({ ...state, status: "canceled", lookupKey: "revetly_growth_monthly", extraSeats: 3 }).extra_seats).toBe(0)
  })
})
