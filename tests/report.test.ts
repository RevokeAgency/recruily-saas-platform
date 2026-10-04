import { describe, expect, it } from "vitest"

import {
  REPORT_MAX_CANDIDATES,
  buildReportCandidate,
  coarseLocation,
  parseReportRequest,
  profileCode,
  rankCandidates,
  reportFileName,
  scrubText,
} from "@/lib/report/model"

const JOB = "aaaaaaaa-0000-4000-8000-000000000001"
const LINK = "4f2a9c00-0000-4000-8000-000000000009"

const row = {
  id: LINK,
  match_score: 86.4,
  hard_skills_score: 90,
  experience_score: 84,
  knockout: false,
  knockout_reasons: [],
  ai_summary: "Lena Maier hat 8 Jahre Diagnose | Lenas Meisterprüfung 2021 | erreichbar unter lena@example.com",
  career_prognosis: "Maier wird schnell Verantwortung übernehmen.",
  match_detail: { categories: { hardSkills: { begruendung: "Frau Maier belegt Hochvolt, Tel. +43 660 1234567." } } },
  interview_guide: { questions: [{ competency: "Führung", question: "Wie hat Lena ihr Team geführt?" }] },
  interview_ratings: [{ question: "Wie hat Lena ihr Team geführt?", rating: 4, notes: "Lena überzeugt, siehe linkedin.com/in/lena" }],
  interview_score: 80,
  interview_notes: "Rückruf unter 0664 1234567",
  candidate: {
    full_name: "Lena Maier",
    email: "lena@example.com",
    phone: "+43 660 1234567",
    job_title: "Kfz-Meisterin",
    location: "Musterstraße 5, 8010 Graz",
    years_of_experience: 8,
    skills: ["Diagnose", "Hydraulik"],
    summary_ai: "Lena Maier ist Kfz-Meisterin aus Graz.",
    dossier: {
      stations: [{ role: "Werkstattleitung", company: "Autohaus Berger", from: "2021-03", to: "heute" }],
      languages: [{ language: "Deutsch", level: "muttersprache" }],
      education: ["Meisterprüfung Kfz-Technik"],
      skills: [{ skill: "Hochvolt", depth: "vertieft" }],
      redFlags: ["Häufige Wechsel"],
      gaps: ["2019: nicht erklärt"],
    },
  },
}

describe("Report anfordern", () => {
  it("nimmt Auswahl, Variante und Inhalte an", () => {
    const r = parseReportRequest({ jobId: JOB, jobCandidateIds: [LINK, LINK], anonymous: true, sections: { questions: false } })
    expect(r).toEqual({
      ok: true,
      value: { jobId: JOB, jobCandidateIds: [LINK], anonymous: true, sections: { match: true, strengths: true, questions: false, interview: true } },
    })
  })

  it("verlangt Kandidaten, begrenzt die Menge und mindestens einen Inhalt", () => {
    expect(parseReportRequest({ jobId: JOB, jobCandidateIds: [] }).ok).toBe(false)
    const many = Array.from({ length: REPORT_MAX_CANDIDATES + 1 }, (_, i) => `4f2a9c00-0000-4000-8000-${String(i).padStart(12, "0")}`)
    expect(parseReportRequest({ jobId: JOB, jobCandidateIds: many }).ok).toBe(false)
    expect(parseReportRequest({ jobId: JOB, jobCandidateIds: [LINK], sections: { match: false, strengths: false, questions: false, interview: false } }).ok).toBe(false)
  })
})

describe("Anonymisierung", () => {
  it("ersetzt Namen, auch einzeln und mit Genitiv", () => {
    expect(scrubText("Lena Maier und Lenas Team, Frau Maier", "Lena Maier", "K-4F2A")).toBe("K-4F2A und K-4F2A Team, Frau K-4F2A")
  })

  it("entfernt E-Mail, Telefon und Links, lässt Jahreszahlen stehen", () => {
    const out = scrubText("Mail lena@example.com, Tel. +43 660 1234567, www.lena.at, 2019 bis 2023", null, "K-1")
    expect(out).toBe("Mail [E-Mail entfernt], Tel. [Telefon entfernt], [Link entfernt] 2019 bis 2023")
  })

  it("kürzt den Ort auf die Stadt", () => {
    expect(coarseLocation("Musterstraße 5, 8010 Graz")).toBe("Graz")
    expect(coarseLocation("Wien")).toBe("Wien")
    expect(coarseLocation("Musterstraße 5")).toBeNull()
  })

  it("gibt im anonymen Report nirgends Name, Kontakt oder Adresse heraus", () => {
    const c = buildReportCandidate(row, true)
    const text = JSON.stringify(c)
    for (const leak of ["Lena", "Maier", "lena@example.com", "1234567", "Musterstraße", "8010", "linkedin"]) {
      expect(text, leak).not.toContain(leak)
    }
    expect(c.title).toBe(`Profil ${profileCode(LINK)}`)
    expect(c.location).toBe("Graz")
    expect(c.email).toBeNull()
    expect(c.phone).toBeNull()
  })

  it("zeigt im Standard-Report alles", () => {
    const c = buildReportCandidate(row, false)
    expect(c.title).toBe("Lena Maier")
    expect(c.email).toBe("lena@example.com")
    expect(c.strengths[0]).toBe("Lena Maier hat 8 Jahre Diagnose")
  })
})

describe("Inhalt", () => {
  it("übernimmt Werdegang, Skills, Sprachen, Fragen und Interview", () => {
    const c = buildReportCandidate(row, false)
    expect(c.score).toBe(86)
    expect(c.stations).toEqual([{ role: "Werkstattleitung", company: "Autohaus Berger", period: "03/2021 bis heute" }])
    expect(c.skills.slice(0, 3)).toEqual(["Hochvolt", "Diagnose", "Hydraulik"])
    expect(c.languages).toEqual([{ language: "Deutsch", level: "Muttersprache" }])
    expect(c.questions).toHaveLength(1)
    expect(c.interview?.score).toBe(80)
    expect(c.interview?.ratings[0].rating).toBe(4)
  })

  it("lässt interne Prüfhinweise weg", () => {
    const text = JSON.stringify(buildReportCandidate(row, false))
    expect(text).not.toContain("Häufige Wechsel")
    expect(text).not.toContain("nicht erklärt")
  })

  it("reiht nach Match, K.O. ans Ende", () => {
    const ranked = rankCandidates([
      { id: "a", score: 90, knockout: true },
      { id: "b", score: 60, knockout: false },
      { id: "c", score: null, knockout: false },
      { id: "d", score: 75, knockout: false },
    ])
    expect(ranked.map((r) => r.id)).toEqual(["d", "b", "c", "a"])
  })

  it("baut einen sauberen Dateinamen", () => {
    expect(reportFileName("Kfz-Mechatroniker:in (m/w/d) Größe", new Date("2026-10-03T08:00:00Z"), true))
      .toBe("Revetly-Report-Kfz-Mechatroniker-in-m-w-d-Grosse-anonym-2026-10-03.pdf")
  })
})

describe("Profilnummer und Interviewvorlage", () => {
  it("ist sechsstellig und bleibt für dieselbe Bewerbung gleich", () => {
    expect(profileCode(LINK)).toBe("K-4F2A9C")
    expect(profileCode(LINK)).toBe(profileCode(LINK))
  })

  it("übernimmt Worauf achten und Anker aus dem Leitfaden, nicht die interne Begründung", () => {
    const c = buildReportCandidate({
      ...row,
      interview_guide: { questions: [{ competency: "Führung", question: "Wie führen Sie?", lookFor: "Beispiel", weakAnchor: "vage", strongAnchor: "konkret", rationale: "Lücke 2019 unklar" }] },
    }, true)
    expect(c.questions[0]).toEqual({ competency: "Führung", question: "Wie führen Sie?", lookFor: "Beispiel", weak: "vage", strong: "konkret" })
    expect(JSON.stringify(c)).not.toContain("Lücke 2019")
  })
})
