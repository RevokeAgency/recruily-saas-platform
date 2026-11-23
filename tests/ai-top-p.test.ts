import { beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

// Mistral Large 4 (mistral-large-latest) lehnt bei Temperatur 0 jeden Aufruf
// ab, wenn top_p nicht 1 ist (Eval vom 23.11.2026). Jeder Aufruf schickt
// deshalb top_p = 1 ausdrücklich mit.

const calls: Array<Record<string, unknown>> = []
vi.mock("ai", async (orig) => {
  const actual = await orig<typeof import("ai")>()
  return {
    ...actual,
    generateText: vi.fn(async (args: Record<string, unknown>) => {
      calls.push(args)
      return { output: { ok: true }, text: "x", toolCalls: [], response: { modelId: "m" } }
    }),
  }
})

beforeEach(() => {
  calls.length = 0
  vi.stubEnv("MISTRAL_API_KEY", "test")
})

describe("top_p = 1 bei jedem Modellaufruf", () => {
  it("generateStructured, generatePlain und generateToolPlan", async () => {
    const { generatePlain, generateStructured, generateToolPlan } = await import("@/lib/ai/generate")
    await generateStructured({ task: "reasoning", schema: z.object({ ok: z.boolean() }), system: "s", prompt: "p", label: "t" })
    await generatePlain({ task: "utility", prompt: "p", label: "t" })
    await generateToolPlan({ task: "agent_plan", system: "s", prompt: "p", tools: {}, label: "t" })
    expect(calls).toHaveLength(3)
    for (const c of calls) {
      expect(c.temperature).toBe(0)
      expect(c.topP).toBe(1)
    }
  })
})
