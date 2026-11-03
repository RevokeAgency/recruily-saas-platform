import { describe, expect, it } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"

import { duplicateMessage, findDuplicateInJob, resumeFingerprint } from "@/lib/matching/duplicate"

const CV = `Sabine Maja
Floristin, Musterstadt
Berufserfahrung
2012 bis heute: Floristmeisterin bei Blumen Muster GmbH, Leitung von vier Mitarbeitenden,
Ausbildung von Lehrlingen, Kundenberatung für Hochzeiten und Trauerfloristik.
2008 bis 2012: Floristin bei Gartencenter Beispiel, Fertigung von festlichen Arrangements.
Kenntnisse: Microsoft Word, Microsoft Excel, Warenwirtschaft, Kassensystem.`

function fakeDb(rows: unknown[]): SupabaseClient {
  const query = {
    select: () => query,
    eq: async () => ({ data: rows, error: null }),
  }
  return { from: () => query } as unknown as SupabaseClient
}

describe("Fingerabdruck des Lebenslaufs", () => {
  it("ist gleich bei anderen Zeilenumbrüchen, Leerzeichen und Großschreibung", () => {
    const anders = CV.replace(/\n/g, "\n\n  ").replace(/Floristin/g, "FLORISTIN")
    expect(resumeFingerprint(anders)).toBe(resumeFingerprint(CV))
  })

  it("unterscheidet einen anderen Lebenslauf", () => {
    expect(resumeFingerprint(CV.replace("vier", "fünf"))).not.toBe(resumeFingerprint(CV))
  })

  it("gibt bei zu wenig Text keinen Fingerabdruck", () => {
    expect(resumeFingerprint("Max Muster, Tischler")).toBeNull()
    expect(resumeFingerprint(null)).toBeNull()
  })
})

describe("Dublette in der Stelle", () => {
  const rows = [
    { id: "link-1", candidate_id: "c-1", candidate: { id: "c-1", full_name: "Sabine Maja", resume_text: CV } },
    { id: "link-2", candidate_id: "c-2", candidate: { id: "c-2", full_name: "Max Muster", resume_text: null } },
  ]

  it("findet denselben Lebenslauf bei einem anderen Kandidaten", async () => {
    const hit = await findDuplicateInJob(fakeDb(rows), "job", CV.toUpperCase(), "c-neu")
    expect(hit).toEqual({ linkId: "link-1", candidateId: "c-1", name: "Sabine Maja" })
    expect(duplicateMessage(hit!)).toContain("(Sabine Maja)")
    expect(duplicateMessage(hit!)).toContain("kein Match verbraucht")
  })

  it("meldet den Kandidaten selbst nicht als Dublette", async () => {
    expect(await findDuplicateInJob(fakeDb(rows), "job", CV, "c-1")).toBeNull()
  })

  it("lässt einen anderen Lebenslauf durch", async () => {
    expect(await findDuplicateInJob(fakeDb(rows), "job", CV.replace("vier", "fünf"))).toBeNull()
  })
})
