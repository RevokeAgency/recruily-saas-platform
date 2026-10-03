import { describe, expect, it } from "vitest"

import {
  REVIEW_MAX_CANDIDATES,
  linkState,
  parseCreateReview,
  parseVerdict,
  toCandidateView,
  verdictCounts,
} from "@/lib/review/shared"
import { createReviewToken, hashReviewToken, plausibleToken } from "@/lib/review/store"

const JOB = "aaaaaaaa-0000-4000-8000-000000000001"
const id = (n: number) => `bbbbbbbb-0000-4000-8000-${String(n).padStart(12, "0")}`

describe("Freigabe-Link anlegen", () => {
  it("nimmt eine gültige Auswahl an und zählt Doppelte einmal", () => {
    const r = parseCreateReview({ jobId: JOB, jobCandidateIds: [id(1), id(2), id(1)], reviewerName: "  Thomas ", reviewerEmail: "t@firma.at", note: "" })
    expect(r).toEqual({
      ok: true,
      value: { jobId: JOB, jobCandidateIds: [id(1), id(2)], reviewerName: "Thomas", reviewerEmail: "t@firma.at", note: null },
    })
  })

  it("verlangt Stelle und mindestens einen Bewerber", () => {
    expect(parseCreateReview({ jobCandidateIds: [id(1)] }).ok).toBe(false)
    expect(parseCreateReview({ jobId: JOB, jobCandidateIds: [] }).ok).toBe(false)
    expect(parseCreateReview({ jobId: JOB, jobCandidateIds: ["kein-uuid"] }).ok).toBe(false)
  })

  it(`begrenzt auf ${REVIEW_MAX_CANDIDATES} Bewerber`, () => {
    const many = Array.from({ length: REVIEW_MAX_CANDIDATES + 1 }, (_, i) => id(i + 1))
    expect(parseCreateReview({ jobId: JOB, jobCandidateIds: many }).ok).toBe(false)
  })

  it("weist ungültige E-Mail-Adressen ab, leere sind erlaubt", () => {
    expect(parseCreateReview({ jobId: JOB, jobCandidateIds: [id(1)], reviewerEmail: "thomas" }).ok).toBe(false)
    expect(parseCreateReview({ jobId: JOB, jobCandidateIds: [id(1)], reviewerEmail: "   " }).ok).toBe(true)
  })
})

describe("Urteil des Fachbereichs", () => {
  it("kennt nur Interessant und Ablehnen", () => {
    expect(parseVerdict({ itemId: id(1), verdict: "interessant", comment: " gerne " })).toEqual({ ok: true, itemId: id(1), verdict: "interessant", comment: "gerne" })
    expect(parseVerdict({ itemId: id(1), verdict: "vielleicht" }).ok).toBe(false)
    expect(parseVerdict({ itemId: "x", verdict: "ablehnen" }).ok).toBe(false)
  })

  it("kürzt überlange Kommentare", () => {
    const r = parseVerdict({ itemId: id(1), verdict: "ablehnen", comment: "a".repeat(5000) })
    expect(r.ok && r.comment?.length).toBe(1000)
  })
})

describe("Ansicht für den Fachbereich", () => {
  const row = {
    id: id(9),
    verdict: null,
    comment: null,
    decided_at: null,
    job_candidate: {
      match_score: 82.4,
      knockout: false,
      knockout_reasons: [],
      ai_summary: "8 Jahre Kfz-Mechatronik | Meisterprüfung 2021 | Teamleitung",
      match_detail: { dossierSummary: "Kein Dossier — Bewertung auf Basis der Strukturdaten." },
      candidate: {
        full_name: "Lena Maier",
        email: "lena@example.com",
        phone: "+43 660 000",
        job_title: "Kfz-Meisterin",
        location: "Graz",
        years_of_experience: 8,
        skills: ["Diagnose", "Hydraulik"],
        summary_ai: null,
        resume_path: "u/c/cv.pdf",
      },
    },
  }

  it("zeigt Zusammenfassung, Match und Lebenslauf", () => {
    const v = toCandidateView(row)
    expect(v.name).toBe("Lena Maier")
    expect(v.score).toBe(82)
    expect(v.strengths).toEqual(["8 Jahre Kfz-Mechatronik", "Meisterprüfung 2021", "Teamleitung"])
    expect(v.hasCv).toBe(true)
    // Platzhalter ohne Dossier wird nicht als Kurzprofil gezeigt.
    expect(v.summary).toBeNull()
  })

  it("gibt keine Kontaktdaten heraus", () => {
    const text = JSON.stringify(toCandidateView(row))
    expect(text).not.toContain("lena@example.com")
    expect(text).not.toContain("+43 660")
    expect(text).not.toContain("u/c/cv.pdf")
  })
})

describe("Stand eines Links", () => {
  it("zählt Urteile", () => {
    expect(verdictCounts([{ verdict: "interessant" }, { verdict: "ablehnen" }, { verdict: null }])).toEqual({ interessant: 1, ablehnen: 1, offen: 1 })
  })

  it("unterscheidet aktiv, abgelaufen, widerrufen und beantwortet", () => {
    const now = new Date("2026-10-03T12:00:00Z")
    expect(linkState({ expires_at: "2026-10-10T00:00:00Z", revoked_at: null }, now)).toBe("aktiv")
    expect(linkState({ expires_at: "2026-10-01T00:00:00Z", revoked_at: null }, now)).toBe("abgelaufen")
    expect(linkState({ expires_at: "2026-10-10T00:00:00Z", revoked_at: "2026-10-02T00:00:00Z" }, now)).toBe("widerrufen")
    expect(linkState({ expires_at: "2026-10-10T00:00:00Z", revoked_at: null, completed_at: "2026-10-03T00:00:00Z" }, now)).toBe("abgeschlossen")
  })
})

describe("Token", () => {
  it("ist zufällig, hat eine feste Form und wird nur als Abdruck gespeichert", () => {
    const a = createReviewToken()
    const b = createReviewToken()
    expect(a.token).not.toBe(b.token)
    expect(plausibleToken(a.token)).toBe(true)
    expect(a.hash).toBe(hashReviewToken(a.token))
    expect(a.hash).not.toContain(a.token)
    expect(plausibleToken("../../etc")).toBe(false)
    expect(plausibleToken(undefined)).toBe(false)
  })
})
