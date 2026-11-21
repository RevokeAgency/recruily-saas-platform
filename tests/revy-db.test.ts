import { execFileSync } from "node:child_process"
import { beforeAll, describe, expect, it } from "vitest"

// Abnahmetest 1 und die Datenschicht von Revy gegen eine echte Postgres-
// Datenbank. Läuft nur, wenn REVY_TEST_PG gesetzt ist, etwa
//   REVY_TEST_PG="host=/home/pgtest port=55432 user=postgres" pnpm vitest run tests/revy-db.test.ts
// Der Test baut die Datenbank revetly_test aus allen Migrationen neu auf
// und lädt tests/db/revy-seed.sql. Nie gegen Produktion richten.

const CONN = process.env.REVY_TEST_PG
const DB = process.env.REVY_TEST_DB || "revetly_test"
const A = "aaaaaaaa-1111-4000-8000-00000000000a"
const B = "bbbbbbbb-2222-4000-8000-00000000000b"
const TEAM_A = "cccccccc-3333-4000-8000-0000000000a2"

function psql(sql: string): string {
  return execFileSync("psql", [`${CONN} dbname=${DB}`, "-qtA", "-v", "ON_ERROR_STOP=1", "-f", "-"], {
    encoding: "utf8",
    input: sql,
    stdio: ["pipe", "pipe", "pipe"],
  }).trim()
}

/** Führt Abfragen als angemeldeter Nutzer aus (Rolle authenticated, RLS aktiv). */
function as(user: string, sql: string): string {
  return psql(`begin; set local role authenticated; set local request.jwt.claim.sub = '${user}';\n${sql};\ncommit;`)
}

function asService(sql: string): string {
  return psql(`begin; set local role service_role;\n${sql};\ncommit;`)
}

function fails(fn: () => unknown): string {
  try {
    fn()
  } catch (e) {
    return String((e as { stderr?: string }).stderr || e)
  }
  throw new Error("Abfrage hätte scheitern müssen")
}

const run = CONN ? describe : describe.skip
if (!CONN) console.info("revy-db: REVY_TEST_PG nicht gesetzt, Datenbanktests übersprungen")

run("Revy-Datenschicht (Postgres)", () => {
  beforeAll(() => {
    execFileSync("bash", ["tests/db/setup-db.sh", CONN!], { stdio: "pipe" })
    execFileSync("psql", [`${CONN} dbname=${DB}`, "-q", "-v", "ON_ERROR_STOP=1", "-f", "tests/db/revy-seed.sql"], {
      stdio: "pipe",
    })
  }, 120_000)

  describe("Test 1: Mandant A erreicht nichts von Mandant B", () => {
    it("Kandidatensicht zeigt nur eigene Pseudonyme", () => {
      expect(as(A, "select ref from revy.candidates order by ref")).toBe("K-AAAA0001\nK-AAAA0002")
      expect(as(B, "select ref from revy.candidates order by ref")).toBe("K-BBBB0001")
    })

    it("Bewerbungen und Stellen von B bleiben unsichtbar", () => {
      expect(as(A, "select count(*) from revy.applications where ref like 'K-BBBB%'")).toBe("0")
      expect(as(A, "select count(*) from revy.jobs where stelle_id = '10000000-0000-0000-0000-00000000000b'")).toBe("0")
      expect(as(A, "select count(*) from revy.applications where candidate_id = '20000000-0000-0000-0000-00000000000b'")).toBe("0")
    })

    it("Belegstellen von B liefern nichts, auch mit bekanntem Pseudonym", () => {
      expect(as(A, "select count(*) from revy.belege('K-BBBB0001', array['SAP','Wien'])")).toBe("0")
      expect(as(B, "select count(*) from revy.belege('K-BBBB0001', array['SAP'])")).toBe("1")
    })

    it("Dokumentseiten, Protokoll und Läufe sind je Mandant getrennt", () => {
      asService(`insert into public.revy_audit (user_id, befehl, wirkung, refs) values ('${B}', 'test b', 'LESEND', '{K-BBBB0001}')`)
      asService(`insert into public.revy_blocked_requests (user_id, kategorie) values ('${B}', 'alter')`)
      expect(as(A, "select count(*) from public.revy_audit")).toBe("0")
      expect(as(A, "select count(*) from public.revy_blocked_requests")).toBe("0")
      expect(as(A, "select count(*) from public.candidate_document_pages where user_id <> '" + A + "'")).toBe("0")
      expect(as(B, "select count(*) from public.revy_audit")).toBe("1")
    })

    it("Datenstand hängt nur von eigenen Daten ab", () => {
      const vorher = as(A, "select revy.datenstand(null)")
      psql(`update public.job_candidates set match_score = 91 where id = '30000000-0000-0000-0000-00000000000b'`)
      expect(as(A, "select revy.datenstand(null)")).toBe(vorher)
    })
  })

  describe("Sichtbarkeit im Team", () => {
    it("Teammitglied sieht die private Stelle von A und deren Bewerbung nicht", () => {
      expect(as(TEAM_A, "select count(*) from revy.jobs where stelle_id = '10000000-0000-0000-0000-0000000000ac'")).toBe("0")
      expect(as(TEAM_A, "select count(*) from revy.applications where stelle_id = '10000000-0000-0000-0000-0000000000ac'")).toBe("0")
      expect(as(TEAM_A, "select count(*) from revy.jobs where stelle_id = '10000000-0000-0000-0000-00000000000a'")).toBe("1")
    })
  })

  describe("Gesperrte Felder sind auf Datenbankebene weg", () => {
    const VERBOTENE_SPALTEN = [
      "full_name", "name", "email", "phone", "telefon", "address", "adresse", "birth_date", "geburtsdatum", "age", "alter",
      "gender", "geschlecht", "nationality", "nationalitaet", "photo", "foto", "photo_url", "summary_ai", "notes",
      "resume_url", "resume_text", "company", "firma",
    ]

    it("keine Sicht von Revy hat eine verbotene Spalte", () => {
      const spalten = psql("select table_name || '.' || column_name from information_schema.columns where table_schema = 'revy'").split("\n")
      expect(spalten.length).toBeGreaterThan(20)
      for (const s of spalten) expect(VERBOTENE_SPALTEN, s).not.toContain(s.split(".")[1])
    })

    it("der Inhalt enthält weder Name, Kontakt, Adresse noch gesperrte Merkmale", () => {
      const alles = as(
        A,
        `select coalesce(json_agg(c)::text, '') from revy.candidates c;
         select coalesce(json_agg(a)::text, '') from revy.applications a;
         select coalesce(json_agg(b)::text, '') from revy.belege('K-AAAA0001', array['Graz','Tel','Geboren','Verheiratet','SAP','Mitarbeitenden','Kinder']) b`,
      )
      for (const verboten of [
        "Sabine", "Maja", "sabine@", "+43", "664", "Hauptstraße", "8010", "12.03.1988", "38 Jahre", "Geboren", "Verheiratet",
        "Mutter", "Kinder", "Elternzeit", "Teilzeit", "Logistikleiterin", "Teamleiterin", "Lager GmbH\"", "2012",
      ]) {
        expect(alles, verboten).not.toContain(verboten)
      }
      expect(alles).not.toMatch(/"niveau": ?"muttersprache"/)
      expect(alles).toContain("verhandlungssicher_oder_muttersprache")
      expect(alles).toContain("SAP EWM")
    })

    it("Belegstellen erscheinen pro Seite nur einmal", () => {
      const zeilen = as(A, "select dokument || seite from revy.belege('K-AAAA0001', array['Graz','Tel','SAP','Mitarbeitenden'])").split("\n")
      expect(new Set(zeilen).size).toBe(zeilen.length)
    })

    it("anon erreicht keine Revy-Sicht", () => {
      expect(fails(() => psql("begin; set local role anon; select count(*) from revy.candidates; commit;"))).toMatch(/permission denied/)
    })

    it("angemeldete Nutzer schreiben nichts in Protokoll oder Läufe", () => {
      expect(
        fails(() => as(A, `insert into public.revy_audit (user_id, befehl, wirkung) values ('${A}', 'x', 'LESEND')`)),
      ).toMatch(/permission denied/)
      expect(
        fails(() => as(A, `insert into public.revy_runs (user_id, session_id) values ('${A}', gen_random_uuid())`)),
      ).toMatch(/permission denied/)
    })
  })

  describe("Protokoll nur zum Anhängen", () => {
    it("Ändern und Löschen scheitern auch für die Service-Rolle", () => {
      asService(`insert into public.revy_audit (user_id, befehl, wirkung) values ('${A}', 'liste', 'LESEND')`)
      expect(fails(() => asService("update public.revy_audit set befehl = 'anders'"))).toMatch(/nur zum Anhängen/)
      expect(fails(() => asService("delete from public.revy_audit"))).toMatch(/nur zum Anhängen/)
      expect(fails(() => asService("delete from public.revy_blocked_requests"))).toMatch(/nur zum Anhängen/)
      asService(`insert into public.revy_incidents (user_id, art) values ('${A}', 'test')`)
      expect(fails(() => asService("update public.revy_incidents set art = 'x'"))).toMatch(/nur zum Anhängen/)
    })
  })

  describe("Kontingent", () => {
    it("zählt pro Monat und sperrt bei erreichtem Limit, ohne Limit unbegrenzt", () => {
      expect(asService(`select public.revy_consume_request('${A}', 2)->>'allowed'`)).toBe("true")
      expect(asService(`select public.revy_consume_request('${A}', 2)->>'allowed'`)).toBe("true")
      expect(asService(`select public.revy_consume_request('${A}', 2)->>'allowed'`)).toBe("false")
      expect(asService(`select public.revy_consume_request('${B}', null)->>'allowed'`)).toBe("true")
      expect(fails(() => as(A, `select public.revy_consume_request('${A}', 100)`))).toMatch(/permission denied/)
    })
  })
})
