import { generateStructured } from "@/lib/ai/generate"
import { z } from "zod"


const RANK_MODEL = process.env.IMLRS_JUDGE_MODEL || "gemini-2.5-pro"

// ─────────────────────────────────────────────────────────────────────────────
// Bestenvergleich: comparative ranking of a job's scored candidates.
//
// Absolute scores answer "how good is X"; direct comparison answers "who is
// best". Comparative judgment is measurably more consistent than isolated
// grading, so this pass ranks the top candidates of one job against each
// other — pairwise reasoning first, then a total order. Temperature 0.
// ─────────────────────────────────────────────────────────────────────────────

const rankSchema = z.object({
  vergleichsanalyse: z.string().describe("ERST die Abwägung: die entscheidenden Unterschiede zwischen den Kandidaten in 3-5 Sätzen (paarweise gedacht: wer schlägt wen und warum)"),
  rankings: z.array(z.object({
    candidateId: z.string().describe("Die ID exakt wie in der Eingabe"),
    begruendung: z.string().describe("1-2 Sätze VERGLEICHEND: warum vor dem Nächstplatzierten bzw. hinter dem Vorherigen"),
    rank: z.number().describe("Platz 1 = bester Kandidat. Jeder Rang genau einmal"),
  })).describe("ALLE übergebenen Kandidaten, vollständig gereiht"),
  topEmpfehlung: z.string().describe("Ein Satz: wer ist die klare Nr. 1 und was macht den Unterschied"),
})

export interface PoolRankCandidate {
  linkId: string
  name: string
  matchScore: number
  interviewScore: number | null
  hardSkills: number | null
  experience: number | null
  aiSummary: string | null
  lowConfidence: string[]
  dossierSummary: string | null
}

export interface PoolRankResult {
  rankings: { linkId: string; rank: number; begruendung: string }[]
  vergleichsanalyse: string
  topEmpfehlung: string
}

const systemPrompt = `Du bist ein Eignungsdiagnostiker, der ein Bewerberfeld VERGLEICHEND reiht (Bestenvergleich).

## Prinzipien
- Denke paarweise: Für benachbarte Plätze muss klar sein, warum A vor B steht.
- Die absoluten Scores sind Ausgangslage, nicht Urteil: Ein Kandidat mit 78 und starken Belegen kann vor einem mit 81 und dünner Beleglage stehen. Interview-Ergebnisse (gemessen!) wiegen schwerer als reine Screening-Scores.
- Schwach belegte Bereiche (niedrige Konfidenz) sind Unsicherheit, kein Bonus.
- Formuliere die Begründungen VERGLEICHEND ("mehr Führungserfahrung als …", "im Interview stärker als …"), nicht als isolierte Zusammenfassung.
- Jeder Rang genau einmal, alle Kandidaten reihen. Antworte auf Deutsch.`

/** Ranks a job's candidates against each other. One temp-0 call, listwise. */
export async function rankPool(
  jobInfo: { title: string; company: string; required_skills?: string[] | null; description?: string | null },
  candidates: PoolRankCandidate[],
): Promise<PoolRankResult> {
  const lines = candidates.map((c) =>
    `ID: ${c.linkId}
Name: ${c.name}
IMLRS-Score: ${c.matchScore} · Interview: ${c.interviewScore ?? "noch keins"} · Hard Skills: ${c.hardSkills ?? "?"} · Erfahrung: ${c.experience ?? "?"}
Profil: ${(c.dossierSummary || c.aiSummary || "—").slice(0, 400)}
Schwach belegt: ${c.lowConfidence.length ? c.lowConfidence.join(", ") : "nichts"}`,
  )

  const { output } = await generateStructured({
    task: "reasoning",
    label: "Bestenvergleich",
    schema: rankSchema,
    system: systemPrompt,
    prompt: `Reihe diese ${candidates.length} Kandidaten für die Stelle vergleichend.

=== STELLE ===
${jobInfo.title} @ ${jobInfo.company}
Muss-Skills: ${(jobInfo.required_skills || []).join(", ") || "keine definiert"}
${(jobInfo.description || "").slice(0, 1200)}

=== KANDIDATEN ===
${lines.join("\n---\n")}`,
  })
  if (!output) throw new Error("Pool ranking failed")

  // Enforce a clean permutation: order by the model's ranks (ties/gaps healed
  // by stable sort), then reassign 1..n. Unknown IDs are dropped, missing ones
  // appended in input order so every candidate always gets a rank.
  const byId = new Map(candidates.map((c) => [c.linkId, c]))
  const seen = new Set<string>()
  const ordered = output.rankings
    .filter((r) => byId.has(r.candidateId) && !seen.has(r.candidateId) && seen.add(r.candidateId))
    .sort((a, b) => a.rank - b.rank)
  for (const c of candidates) {
    if (!seen.has(c.linkId)) ordered.push({ candidateId: c.linkId, rank: ordered.length + 1, begruendung: "Vom Vergleich nicht erfasst — ans Ende gereiht." })
  }

  return {
    rankings: ordered.map((r, i) => ({ linkId: r.candidateId, rank: i + 1, begruendung: r.begruendung })),
    vergleichsanalyse: output.vergleichsanalyse,
    topEmpfehlung: output.topEmpfehlung,
  }
}
