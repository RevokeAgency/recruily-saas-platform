#!/usr/bin/env node
/**
 * IMLRS Eval-Harness — replays the golden set against the live matching
 * pipeline so no prompt/rubric change ships blind.
 *
 *   MISTRAL_API_KEY=... node --experimental-strip-types scripts/eval/run-eval.mjs
 *
 * Options:
 *   --runs=2        score each case N times to measure consistency (drift)
 *   --case=<id>     run a single case
 *   --json          machine-readable output (for CI)
 *
 * Exit code 1 if any case falls outside its expected band → usable as a gate.
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, "../..")

const args = process.argv.slice(2)
const opt = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.split("=")[1] : fallback
}
const RUNS = Math.max(1, Number(opt("runs", "1")) || 1)
const ONLY = opt("case", null)
const AS_JSON = args.includes("--json")

if (!process.env.MISTRAL_API_KEY && !process.env.MISTRAL_GENERATIVE_AI_API_KEY) {
  console.error("MISTRAL_API_KEY fehlt — das Eval braucht echte Modell-Aufrufe.")
  process.exit(2)
}

const { runIMLRSMatch } = await import(path.join(repoRoot, "lib/matching/imlrs.ts"))
const golden = JSON.parse(fs.readFileSync(path.join(here, "golden-set.json"), "utf8"))
const cases = golden.cases.filter((c) => !ONLY || c.id === ONLY)

if (cases.length === 0) {
  console.error(`Kein Fall gefunden${ONLY ? ` für --case=${ONLY}` : ""}.`)
  process.exit(2)
}

const results = []
for (const c of cases) {
  const scores = []
  const kos = []
  let error = null
  for (let i = 0; i < RUNS; i++) {
    try {
      const m = await runIMLRSMatch(c.candidate, c.job)
      scores.push(m.overallScore)
      kos.push(m.knockout)
    } catch (err) {
      error = err instanceof Error ? err.message : String(err)
      break
    }
  }

  if (error) {
    results.push({ id: c.id, ok: false, error })
    if (!AS_JSON) console.log(`✗ ${c.id}: FEHLER — ${error}`)
    continue
  }

  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  const spread = Math.max(...scores) - Math.min(...scores)
  const koConsistent = kos.every((k) => k === kos[0])
  const inBand = avg >= c.expect.minOverall && avg <= c.expect.maxOverall
  const koOk = c.expect.knockout == null || kos[0] === c.expect.knockout
  const ok = inBand && koOk && koConsistent

  results.push({ id: c.id, ok, avg, scores, spread, knockout: kos[0], expect: c.expect, koConsistent })

  if (!AS_JSON) {
    const band = `${c.expect.minOverall}-${c.expect.maxOverall}`
    const parts = [
      `${ok ? "✓" : "✗"} ${c.id}`,
      `Score ${avg} (erwartet ${band})`,
      RUNS > 1 ? `Streuung ${spread} über ${RUNS} Läufe` : null,
      c.expect.knockout != null ? `KO ${kos[0]} (erwartet ${c.expect.knockout})` : null,
      RUNS > 1 && !koConsistent ? "KO INKONSISTENT" : null,
    ].filter(Boolean)
    console.log(parts.join(" · "))
    if (!ok) console.log(`   ↳ ${c.note}`)
  }
}

const failed = results.filter((r) => !r.ok)
const maxSpread = Math.max(0, ...results.map((r) => r.spread ?? 0))

if (AS_JSON) {
  console.log(JSON.stringify({ runs: RUNS, results, failed: failed.length, maxSpread }, null, 2))
} else {
  console.log(`\n${results.length - failed.length}/${results.length} Fälle im erwarteten Band`)
  if (RUNS > 1) console.log(`Maximale Streuung über ${RUNS} Läufe: ${maxSpread} Punkte (Ziel: ≤ 3)`)
}

process.exit(failed.length > 0 ? 1 : 0)
