import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"

// Bewerberdaten dürfen die EU nicht verlassen. Dieser Test schlägt fehl,
// sobald ein Anbieter außerhalb der EU in eine Modellkette, in die Liste der
// zugelassenen Anbieter oder als Paket ins Projekt kommt.

const TASKS = ["reasoning", "extraction", "utility", "verification", "vision", "agent_plan", "agent_write"] as const
const NON_EU_SDKS = ["@ai-sdk/google", "@ai-sdk/openai", "@ai-sdk/anthropic", "@ai-sdk/azure", "@ai-sdk/amazon-bedrock", "@ai-sdk/groq", "@ai-sdk/xai", "openai", "@google/generative-ai", "@anthropic-ai/sdk"]

async function load() {
  vi.resetModules()
  return import("@/lib/ai/provider")
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("Modellkette bleibt in der EU", () => {
  it("jede Aufgabe läuft nur über Mistral, auch wenn der alte Schalter gesetzt ist", async () => {
    vi.stubEnv("MISTRAL_API_KEY", "test")
    vi.stubEnv("AI_ALLOW_NON_EU_FALLBACK", "true")
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "test")
    const { modelChain, PROVIDERS } = await load()
    for (const task of TASKS) {
      const chain = modelChain(task)
      expect(chain.length, task).toBeGreaterThan(0)
      for (const m of chain) {
        expect(m.provider, `${task}: ${m.provider}`).toBe("mistral")
        expect(m.euResident).toBe(true)
        expect(PROVIDERS[m.provider].eu).toBe(true)
      }
    }
  })

  it("jeder zugelassene Anbieter ist als EU markiert", async () => {
    const { PROVIDERS } = await load()
    for (const [name, p] of Object.entries(PROVIDERS)) expect(p.eu, name).toBe(true)
  })

  it("Revy plant mit dem großen und formuliert mit dem kleinen Modell", async () => {
    vi.stubEnv("MISTRAL_API_KEY", "test")
    const { describeChain } = await load()
    expect(describeChain("agent_plan")[0]).toBe("mistral:mistral-large-latest")
    expect(describeChain("agent_write")[0]).toBe("mistral:mistral-small-latest")
    // Erst das große Modell des Matchings, dann small (Protokoll 23.11.2026)
    expect(describeChain("agent_plan")).toEqual(["mistral:mistral-large-latest", "mistral:mistral-large-2512", "mistral:mistral-small-latest"])
  })

  it("Matching-Modell lässt sich für einen Ablauf übersteuern, Revy bleibt unberührt", async () => {
    vi.stubEnv("MISTRAL_API_KEY", "test")
    const { describeChain, withMatchingModel } = await load()
    expect(describeChain("reasoning")[0]).toBe("mistral:mistral-large-2512")
    const inner = await withMatchingModel("mistral-large-latest", async () => ({
      reasoning: describeChain("reasoning")[0],
      verification: describeChain("verification")[0],
      agent: describeChain("agent_plan")[0],
    }))
    expect(inner).toEqual({ reasoning: "mistral:mistral-large-latest", verification: "mistral:mistral-large-latest", agent: "mistral:mistral-large-latest" })
    expect(describeChain("reasoning")[0]).toBe("mistral:mistral-large-2512")
    expect(() => withMatchingModel("gpt-4o", async () => 1)).toThrow(/Unbekanntes Modell/)
  })

  it("AI_MODEL_MATCHING stellt alle Matching-Aufgaben um", async () => {
    vi.stubEnv("MISTRAL_API_KEY", "test")
    vi.stubEnv("AI_MODEL_MATCHING", "mistral-large-latest")
    const { describeChain } = await load()
    for (const t of ["reasoning", "extraction", "utility", "verification"] as const) expect(describeChain(t)[0]).toBe("mistral:mistral-large-latest")
    expect(describeChain("agent_write")[0]).toBe("mistral:mistral-small-latest")
  })

  it("kein Nicht-EU-SDK in package.json", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as Record<string, Record<string, string> | undefined>
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }
    for (const sdk of NON_EU_SDKS) expect(Object.keys(deps), sdk).not.toContain(sdk)
  })

  it("kein Code importiert ein Nicht-EU-SDK", () => {
    const files: string[] = []
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f)
        if (statSync(p).isDirectory()) walk(p)
        else if (/\.(ts|tsx|mjs|js)$/.test(f)) files.push(p)
      }
    }
    for (const d of ["app", "lib", "components"]) walk(d)
    for (const f of files) {
      const src = readFileSync(f, "utf8")
      for (const sdk of NON_EU_SDKS) expect(src.includes(`from "${sdk}"`), `${f} importiert ${sdk}`).toBe(false)
    }
  })
})
