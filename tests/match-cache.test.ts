import { describe, expect, it } from "vitest"

import { matchInputHash, readMatchCache, stableJson, writeMatchCache } from "@/lib/matching/cache"
import type { IMLRSCandidateInput, IMLRSJobInput, IMLRSMatchResult } from "@/lib/matching/imlrs"

const candidate: IMLRSCandidateInput = {
  id: "c-1",
  name: "Sabine Maja",
  skills: ["Floristik", "Kundenberatung"],
  years_of_experience: 13,
  location: "Musterstadt",
  resume_text: "Sabine Maja\nFloristmeisterin seit 2012, Leitung von vier Mitarbeitenden.",
  cover_letter_text: null,
}

const job: IMLRSJobInput = {
  id: "j-1",
  title: "Filialleitung Floristik",
  company: "Blumen Muster GmbH",
  required_skills: ["Floristik", "Mitarbeiterführung"],
  description: "Leitung einer Filiale mit sechs Mitarbeitenden.",
  ko_criteria: [],
}

const hash = (c = candidate, j = job, weights: Record<string, number> | null = null) =>
  matchInputHash({ candidate: c, job: j, weights })

describe("Fingerabdruck der Matching-Eingaben", () => {
  it("ist unabhängig von Ids, Dossier und Schreibweise des Lebenslaufs", () => {
    const other = {
      ...candidate,
      id: "c-2",
      dossier: { summary: "x" } as unknown as IMLRSCandidateInput["dossier"],
      resume_text: candidate.resume_text!.toUpperCase().replace("\n", "\n\n  "),
    }
    expect(hash(other, { ...job, id: "j-2" })).toBe(hash())
  })

  it("ändert sich mit der Stelle, den K.O.-Kriterien und der Gewichtung", () => {
    expect(hash(candidate, { ...job, description: "Leitung einer Filiale mit acht Mitarbeitenden." })).not.toBe(hash())
    expect(hash(candidate, { ...job, ko_criteria: ["Führerschein B"] })).not.toBe(hash())
    expect(hash(candidate, job, { hardSkills: 0.3 })).not.toBe(hash())
  })

  it("ändert sich mit dem Lebenslauf", () => {
    expect(hash({ ...candidate, resume_text: candidate.resume_text + " Meisterprüfung 2015." })).not.toBe(hash())
  })

  it("sortiert Schlüssel, damit die Reihenfolge keine Rolle spielt", () => {
    expect(stableJson({ b: 1, a: { d: 2, c: 3 } })).toBe(stableJson({ a: { c: 3, d: 2 }, b: 1 }))
  })
})

describe("Cache ohne Datenbank", () => {
  it("liefert nichts und wirft nicht", async () => {
    expect(await readMatchCache("u", "h")).toBeNull()
  })

  it("legt unvollständige Ergebnisse nicht ab", async () => {
    await expect(
      writeMatchCache({
        ownerId: "u",
        candidateId: "c",
        jobId: "j",
        hash: "h",
        result: { complete: false } as IMLRSMatchResult,
      }),
    ).resolves.toBeUndefined()
  })
})
