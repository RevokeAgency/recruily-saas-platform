import { describe, expect, it } from "vitest"

import { PLANS, type PlanId } from "@/lib/plans"
import { hasAutomation } from "@/lib/quota"

const ORDER: PlanId[] = ["free", "starter", "growth", "pro", "enterprise"]

describe("Planpakete", () => {
  it("Absagen per E-Mail und Terminbuchung erst ab Growth", () => {
    expect(ORDER.map(hasAutomation)).toEqual([false, false, true, true, true])
    expect(hasAutomation(null)).toBe(false)
    expect(hasAutomation("unbekannt")).toBe(false)
  })

  it("ab Starter steht an dritter Stelle 'Alles aus <Vorgänger>'", () => {
    for (let i = 1; i < ORDER.length; i++) {
      expect(PLANS[ORDER[i]].features[2]).toBe(`Alles aus ${PLANS[ORDER[i - 1]].label}`)
    }
  })

  it("jede Funktion steht nur beim kleinsten Plan, der sie hat", () => {
    const seen = new Map<string, PlanId>()
    for (const id of ORDER) {
      // Index 0 und 1 sind Kontingent und Stellen, die gelten pro Plan.
      for (const f of PLANS[id].features.slice(2)) {
        if (f.startsWith("Alles aus")) continue
        expect(seen.get(f), `"${f}" steht schon bei ${seen.get(f)}`).toBeUndefined()
        seen.set(f, id)
      }
    }
  })

  it("Absagen und Terminbuchung tauchen erst bei Growth auf", () => {
    const lower = [...PLANS.free.features, ...PLANS.starter.features].join(" ")
    expect(lower).not.toMatch(/Absage|Terminbuchung/)
    expect(PLANS.growth.features.join(" ")).toMatch(/Absagen per E-Mail/)
    expect(PLANS.growth.features.join(" ")).toMatch(/Terminbuchung/)
  })
})
