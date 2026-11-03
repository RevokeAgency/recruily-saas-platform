import { describe, expect, it } from "vitest"

import { AI_MAX_RETRIES, isRateLimit, isTierNotAllowed, providerErrorDetail } from "@/lib/ai/generate"

describe("Rate-Limit beim KI-Anbieter", () => {
  it("erkennt die Meldungen des Anbieters", () => {
    expect(isRateLimit("Failed after 3 attempts. Last error: Rate limit exceeded")).toBe(true)
    expect(isRateLimit("429 Too Many Requests")).toBe(true)
    expect(isRateLimit("Service tier capacity exceeded for this model")).toBe(true)
    expect(isRateLimit("Invalid JSON in response")).toBe(false)
  })

  it("erkennt ein Modell, das im Tarif fehlt", () => {
    expect(isTierNotAllowed("mistral:mistral-large-2512: This model is not available in your subscription tier")).toBe(true)
    expect(isTierNotAllowed("Rate limit exceeded")).toBe(false)
  })

  it("wartet lange genug für ein Limit pro Minute", () => {
    // 2 + 4 + 8 + 16 Sekunden je Modell, zwei Modelle in der Kette
    const waitPerModel = Array.from({ length: AI_MAX_RETRIES }, (_, i) => 2 * 2 ** i).reduce((a, b) => a + b, 0)
    expect(waitPerModel * 2).toBeGreaterThanOrEqual(60)
  })

  it("zeigt Status, Antwort und Limit-Header des letzten Versuchs", () => {
    const last = {
      statusCode: 429,
      responseBody: '{"message":"Requests rate limit exceeded"}',
      responseHeaders: { "x-ratelimit-remaining-tokens-minute": "0", "content-type": "application/json" },
    }
    const retryError = { message: "Failed after 5 attempts", errors: [last, last, last, last, last], lastError: last }
    const detail = providerErrorDetail(retryError)!
    expect(detail).toContain("HTTP 429 nach 5 Versuchen")
    expect(detail).toContain("Requests rate limit exceeded")
    expect(detail).toContain("x-ratelimit-remaining-tokens-minute=0")
    expect(detail).not.toContain("content-type")
    expect(providerErrorDetail(new Error("nichts"))).toBeNull()
  })
})
