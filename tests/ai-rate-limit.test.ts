import { describe, expect, it } from "vitest"

import { AI_MAX_RETRIES, isRateLimit } from "@/lib/ai/generate"

describe("Rate-Limit beim KI-Anbieter", () => {
  it("erkennt die Meldungen des Anbieters", () => {
    expect(isRateLimit("Failed after 3 attempts. Last error: Rate limit exceeded")).toBe(true)
    expect(isRateLimit("429 Too Many Requests")).toBe(true)
    expect(isRateLimit("Service tier capacity exceeded for this model")).toBe(true)
    expect(isRateLimit("Invalid JSON in response")).toBe(false)
  })

  it("wartet lange genug für ein Limit pro Minute", () => {
    // 2 + 4 + 8 + 16 Sekunden je Modell, zwei Modelle in der Kette
    const waitPerModel = Array.from({ length: AI_MAX_RETRIES }, (_, i) => 2 * 2 ** i).reduce((a, b) => a + b, 0)
    expect(waitPerModel * 2).toBeGreaterThanOrEqual(60)
  })
})
