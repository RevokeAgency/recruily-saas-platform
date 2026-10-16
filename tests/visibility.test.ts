import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { DEFAULT_VISIBILITY, canChangeVisibility, jobVisibleTo, parseVisibility, withoutVisibility } from "@/lib/team/visibility"

const SQL = readFileSync("scripts/036_job_visibility.sql", "utf8")

describe("Sichtbarkeit von Stellen", () => {
  it("neue Stellen sind privat, nur 'team' öffnet sie", () => {
    expect(DEFAULT_VISIBILITY).toBe("private")
    expect(parseVisibility(undefined)).toBe("private")
    expect(parseVisibility("öffentlich")).toBe("private")
    expect(parseVisibility("team")).toBe("team")
    expect(SQL).toMatch(new RegExp(`visibility text not null default '${DEFAULT_VISIBILITY}'`))
  })

  it("Inhaber sieht alles, Mitglieder Team-Stellen und eigene", () => {
    const priv = { visibility: "private", created_by: "anna" }
    expect(jobVisibleTo("owner", "owner", priv)).toBe(true)
    expect(jobVisibleTo("anna", "owner", priv)).toBe(true)
    expect(jobVisibleTo("ben", "owner", priv)).toBe(false)
    expect(jobVisibleTo("ben", "owner", { visibility: "team", created_by: "anna" })).toBe(true)
    expect(jobVisibleTo("ben", "owner", undefined)).toBe(true)
  })

  it("Sichtbarkeit ändern Ersteller und Inhaber", () => {
    expect(canChangeVisibility({ user_id: "owner", created_by: "anna" }, "anna")).toBe(true)
    expect(canChangeVisibility({ user_id: "owner", created_by: "anna" }, "owner")).toBe(true)
    expect(canChangeVisibility({ user_id: "owner", created_by: "anna" }, "ben")).toBe(false)
    expect(canChangeVisibility({ user_id: "owner", created_by: null }, "ben")).toBe(false)
    expect(canChangeVisibility({ user_id: "owner" }, "ben")).toBe(true)
  })

  it("lässt die Spalte weg, solange Migration 036 fehlt", () => {
    expect(withoutVisibility({ title: "x", visibility: "team" })).toEqual({ title: "x" })
  })

  it("Migration 036 schränkt Stellen, Bewerbungen, Bewerber, Protokoll und Freigaben ein", () => {
    expect(SQL).toMatch(/on public\.jobs\n  for select using \(user_id = \(select public\.current_workspace\(\)\)\n    and \(user_id = auth\.uid\(\) or visibility = 'team' or created_by = auth\.uid\(\)\)\)/)
    for (const table of ["job_candidates", "review_links"]) {
      expect(SQL, table).toMatch(new RegExp(`on public\\.${table}\\n  for select using \\(user_id = \\(select public\\.current_workspace\\(\\)\\) and public\\.job_visible\\(job_id\\)\\)`))
    }
    expect(SQL).toMatch(/on public\.candidates\n  for select using \(.*public\.candidate_visible\(id\)\)/)
    expect(SQL).toMatch(/decision_events\n  for select using \([\s\S]*?public\.job_visible\(job_id\)\)\)/)
  })
})
