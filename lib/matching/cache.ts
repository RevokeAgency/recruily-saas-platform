import { createHash } from "node:crypto"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { describeChain } from "@/lib/ai/provider"
import { withApplicantTextRule } from "@/lib/ai/applicant-text"
import { DOSSIER_SYSTEM_PROMPT } from "@/lib/matching/dossier"
import { normalizeResumeText } from "@/lib/matching/duplicate"
import { SKILL_COVERAGE_PROMPT, ZULASSUNG_FEHLT_CAP, ZULASSUNG_TEILWEISE_CAP } from "@/lib/matching/hard-facts"
import {
  judgeSystemPrompt,
  verifierSystemPrompt,
  type IMLRSCandidateInput,
  type IMLRSJobInput,
  type IMLRSMatchResult,
} from "@/lib/matching/imlrs"

// Ergebnis-Cache für das Matching (Migration 038, Erläuterung in
// scripts/038_match_cache.md).
//
// Gleiche Eingaben ergeben denselben Score. Vor dem ersten KI-Aufruf wird ein
// Fingerabdruck über alles gebildet, was das Ergebnis beeinflusst. Gibt es
// dazu schon ein vollständiges Ergebnis im selben Arbeitsbereich, wird es
// übernommen.
//
// Prompts und Modelle gehen automatisch in den Fingerabdruck ein. Wer die
// Berechnung selbst ändert (Gewichte, Obergrenzen, Zusammenrechnen), erhöht
// MATCH_LOGIC_VERSION, sonst blieben alte Ergebnisse gültig.

export const MATCH_LOGIC_VERSION = 1

let tableMissingLogged = false

/** Fingerabdruck der Matching-Logik: Version, Prompts, Obergrenzen, Modelle. */
export function logicSignature(): string {
  return sha256(
    stableJson({
      version: MATCH_LOGIC_VERSION,
      prompts: [
        withApplicantTextRule(judgeSystemPrompt),
        withApplicantTextRule(verifierSystemPrompt),
        withApplicantTextRule(DOSSIER_SYSTEM_PROMPT),
        SKILL_COVERAGE_PROMPT,
      ],
      caps: [ZULASSUNG_FEHLT_CAP, ZULASSUNG_TEILWEISE_CAP],
      models: {
        reasoning: describeChain("reasoning")[0] ?? null,
        verification: describeChain("verification")[0] ?? null,
        extraction: describeChain("extraction")[0] ?? null,
        utility: describeChain("utility")[0] ?? null,
      },
    }),
  )
}

/** Fingerabdruck aller Eingaben eines Matchings. */
export function matchInputHash(input: {
  candidate: IMLRSCandidateInput
  job: IMLRSJobInput
  weights: Record<string, number> | null
}): string {
  // Ids und das zwischengespeicherte Dossier beeinflussen das Ergebnis nicht
  // (das Dossier ist aus dem Lebenslauf abgeleitet, der schon drin ist).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _cid, dossier: _dossier, resume_text, cover_letter_text, ...candidate } = input.candidate
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _jid, ...job } = input.job
  return sha256(
    stableJson({
      logic: logicSignature(),
      resume: resume_text ? normalizeResumeText(resume_text) : null,
      cover: cover_letter_text ? normalizeResumeText(cover_letter_text) : null,
      candidate,
      job,
      weights: input.weights,
    }),
  )
}

function admin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

function isMissingTable(message: string | undefined): boolean {
  return /match_cache/.test(message ?? "") && /does not exist|schema cache|not find/i.test(message ?? "")
}

function logMissing(message: string | undefined) {
  if (tableMissingLogged) return
  tableMissingLogged = true
  console.warn(`[match-cache] Tabelle fehlt, Matching läuft ohne Cache (Migration 038): ${message}`)
}

export interface CachedMatch {
  result: IMLRSMatchResult
  createdAt: string
}

/** Liest ein Ergebnis aus dem Cache. Wirft nie, im Zweifel null. */
export async function readMatchCache(ownerId: string, hash: string): Promise<CachedMatch | null> {
  const db = admin()
  if (!db) return null
  try {
    const { data, error } = await db
      .from("match_cache")
      .select("id, result, created_at, hits")
      .eq("user_id", ownerId)
      .eq("input_hash", hash)
      .maybeSingle()
    if (error) {
      if (isMissingTable(error.message)) logMissing(error.message)
      else console.error("[match-cache] Lesen fehlgeschlagen:", error.message)
      return null
    }
    if (!data) return null
    await db
      .from("match_cache")
      .update({ hits: (data.hits ?? 0) + 1, last_hit_at: new Date().toISOString() })
      .eq("id", data.id)
      .then(({ error: e }) => { if (e) console.error("[match-cache] Zähler übersprungen:", e.message) })
    return { result: data.result as IMLRSMatchResult, createdAt: data.created_at as string }
  } catch (err) {
    console.error("[match-cache] Lesen fehlgeschlagen:", err)
    return null
  }
}

/** Legt ein vollständiges Ergebnis ab. Wirft nie. */
export async function writeMatchCache(entry: {
  ownerId: string
  candidateId: string
  jobId: string
  hash: string
  result: IMLRSMatchResult
}): Promise<void> {
  if (!entry.result.complete) return
  const db = admin()
  if (!db) return
  try {
    // Das frische Dossier liegt schon beim Kandidaten, im Cache wäre es doppelt.
    const result = { ...entry.result, dossier: null }
    const { error } = await db.from("match_cache").upsert(
      {
        user_id: entry.ownerId,
        candidate_id: entry.candidateId,
        job_id: entry.jobId,
        input_hash: entry.hash,
        result,
      },
      { onConflict: "user_id,input_hash" },
    )
    if (error) {
      if (isMissingTable(error.message)) logMissing(error.message)
      else console.error("[match-cache] Schreiben fehlgeschlagen:", error.message)
    }
  } catch (err) {
    console.error("[match-cache] Schreiben fehlgeschlagen:", err)
  }
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex")
}

/** JSON mit sortierten Schlüsseln, damit die Reihenfolge den Hash nicht ändert. */
export function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  )
}
