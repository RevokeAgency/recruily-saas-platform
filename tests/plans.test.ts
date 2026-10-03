import { describe, expect, it } from "vitest"

import { FEATURE_MIN_PLAN, PLANS, PLAN_ORDER, featureFrom, hasFeature, type Feature } from "@/lib/plans"
import { requireFeature } from "@/lib/quota"

const ORDER = PLAN_ORDER

describe("Funktionen nach Plan", () => {
  it("gelten ab dem genannten Plan und in allen größeren", () => {
    const expected: Record<Feature, boolean[]> = {
      inbound_email: [false, true, true, true, true],
      analytics_basic: [false, true, true, true, true],
      analytics_full: [false, false, true, true, true],
      rejection_email: [false, false, true, true, true],
      self_booking: [false, false, true, true, true],
      talent_pool: [false, false, true, true, true],
      interview_guide: [false, false, true, true, true],
      pool_rank: [false, false, true, true, true],
    }
    for (const feature of Object.keys(FEATURE_MIN_PLAN) as Feature[]) {
      expect(ORDER.map((p) => hasFeature(p, feature)), feature).toEqual(expected[feature])
    }
  })

  it("unbekannte oder fehlende Pläne bekommen nichts", () => {
    expect(hasFeature(null, "inbound_email")).toBe(false)
    expect(hasFeature(undefined, "talent_pool")).toBe(false)
    expect(hasFeature("unbekannt", "rejection_email")).toBe(false)
  })

  it("nennt den kleinsten Plan für Hinweise", () => {
    expect(featureFrom("inbound_email")).toBe("Starter")
    expect(featureFrom("talent_pool")).toBe("Growth")
  })
})

describe("Planlisten", () => {
  it("ab Starter steht an dritter Stelle 'Alles aus <Vorgänger>'", () => {
    for (let i = 1; i < ORDER.length; i++) {
      expect(PLANS[ORDER[i]].features[2]).toBe(`Alles aus ${PLANS[ORDER[i - 1]].label}`)
    }
  })

  it("jede Funktion steht nur beim kleinsten Plan, der sie hat", () => {
    const seen = new Map<string, string>()
    for (const id of ORDER) {
      // Index 0 und 1 sind Kontingent und Stellen, die gelten pro Plan.
      for (const f of PLANS[id].features.slice(2)) {
        if (f.startsWith("Alles aus")) continue
        expect(seen.get(f), `"${f}" steht schon bei ${seen.get(f)}`).toBeUndefined()
        seen.set(f, id)
      }
    }
  })

  // Die Liste muss zur Sperre passen: Was ein Plan nicht hat, darf in seiner
  // Liste nicht stehen, und es muss beim richtigen Plan auftauchen.
  it("Funktionen stehen genau beim Plan, ab dem sie gelten", () => {
    const listed: Array<[RegExp, Feature]> = [
      [/Bewerbungen per E-Mail/, "inbound_email"],
      [/Recruiting-Kennzahlen/, "analytics_basic"],
      [/Statistiken pro Stelle/, "analytics_full"],
      [/Absagen per E-Mail/, "rejection_email"],
      [/Terminbuchung/, "self_booking"],
      [/Talent-Pool/, "talent_pool"],
      [/Interviewleitfäden/, "interview_guide"],
      [/Bestenvergleich/, "pool_rank"],
    ]
    for (const [re, feature] of listed) {
      const where = ORDER.filter((p) => PLANS[p].features.some((f) => re.test(f)))
      expect(where, feature).toEqual([FEATURE_MIN_PLAN[feature]])
    }
  })
})

describe("requireFeature", () => {
  // Kleinster Ersatz für den Supabase-Client: liefert den Plan des Kontos.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Db = any
  const db = (plan: string | null): Db => ({
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: plan ? { plan } : null }) }) }) }),
  })

  it("lässt Konten mit passendem Plan durch", async () => {
    expect(await requireFeature(db("growth"), "u", "talent_pool", "Den Talent-Pool")).toBeNull()
  })

  it("antwortet sonst mit 403 und Hinweis auf den Plan", async () => {
    const res = await requireFeature(db("starter"), "u", "talent_pool", "Den Talent-Pool")
    expect(res?.status).toBe(403)
    expect(await res?.json()).toEqual({
      error: "Den Talent-Pool gibt es ab dem Plan Growth.",
      upgrade: true,
      feature: "talent_pool",
    })
  })

  it("sperrt, wenn kein Profil gefunden wird", async () => {
    expect((await requireFeature(db(null), "u", "inbound_email", "Bewerbungen per E-Mail"))?.status).toBe(403)
  })
})
