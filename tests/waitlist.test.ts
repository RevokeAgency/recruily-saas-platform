import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { COMING_SOON_PATH, launchGate, launchMode, type LaunchMode } from "@/lib/launch"
import {
  createConfirmToken,
  hashConfirmToken,
  plausibleConfirmToken,
  unsubscribeToken,
  verifyUnsubscribeToken,
} from "@/lib/waitlist/token"

const TOKEN = "vorschau-geheim-123"

function gate(mode: LaunchMode, path: string, cookie?: string) {
  const url = new URL(path, "https://www.revetly.ai")
  return launchGate({
    mode,
    pathname: url.pathname,
    searchParams: url.searchParams,
    previewCookie: cookie,
    previewToken: TOKEN,
  })
}

describe("Launch-Schalter", () => {
  it("liest den Modus aus der Variable", () => {
    expect(launchMode(undefined)).toBe("live")
    expect(launchMode("live")).toBe("live")
    expect(launchMode(" Waitlist ")).toBe("waitlist")
    expect(launchMode("irgendwas")).toBe("live")
  })

  it("live: alles läuft normal, die Coming-Soon-Seite hat keine eigene Adresse", () => {
    expect(gate("live", "/")).toEqual({ type: "next", preview: false })
    expect(gate("live", "/auth/register")).toEqual({ type: "next", preview: false })
    expect(gate("live", "/?vorschau=" + TOKEN)).toEqual({ type: "next", preview: false })
    expect(gate("live", COMING_SOON_PATH)).toMatchObject({ type: "redirect", pathname: "/" })
  })

  it("Warteliste: Startseite zeigt die Coming-Soon-Seite, Registrierung ist zu", () => {
    expect(gate("waitlist", "/")).toEqual({ type: "rewrite", pathname: COMING_SOON_PATH })
    expect(gate("waitlist", "/auth/register")).toMatchObject({ type: "redirect", pathname: "/" })
    expect(gate("waitlist", "/auth/register/x")).toMatchObject({ type: "redirect", pathname: "/" })
    expect(gate("waitlist", "/coming-soon/")).toMatchObject({ type: "redirect", pathname: "/" })
  })

  it("Warteliste: Blog, Rechtstexte, Login, App und Stellenseiten bleiben erreichbar", () => {
    for (const path of ["/blog", "/blog/x", "/datenschutz", "/impressum", "/auth/reset", "/dashboard", "/jobs/firma/stelle", "/team/einladung/abc", "/warteliste/bestaetigen/abc", "/api/waitlist"]) {
      expect(gate("waitlist", path), path).toEqual({ type: "next", preview: false })
    }
  })

  it("Vorschau: richtiges Token setzt das Cookie, falsches nicht, aus löscht es", () => {
    expect(gate("waitlist", `/?vorschau=${TOKEN}&utm=x`)).toEqual({ type: "redirect", pathname: "/", search: "?utm=x", cookie: "set" })
    expect(gate("waitlist", "/?vorschau=falsch")).toEqual({ type: "redirect", pathname: "/", search: "" })
    expect(gate("waitlist", "/blog?vorschau=aus")).toEqual({ type: "redirect", pathname: "/blog", search: "", cookie: "clear" })
  })

  it("Vorschau: mit Cookie sieht man Landing und Registrierung", () => {
    expect(gate("waitlist", "/", TOKEN)).toEqual({ type: "next", preview: true })
    expect(gate("waitlist", "/auth/register", TOKEN)).toEqual({ type: "next", preview: true })
    expect(gate("waitlist", "/", "altes-token")).toEqual({ type: "rewrite", pathname: COMING_SOON_PATH })
  })

  it("ohne LAUNCH_PREVIEW_TOKEN gibt es keine Vorschau", () => {
    const url = new URL("/?vorschau=", "https://www.revetly.ai")
    const g = launchGate({ mode: "waitlist", pathname: "/", searchParams: url.searchParams, previewCookie: "", previewToken: undefined })
    expect(g).toEqual({ type: "redirect", pathname: "/", search: "" })
    expect(launchGate({ mode: "waitlist", pathname: "/", searchParams: new URLSearchParams(), previewCookie: "", previewToken: "" }))
      .toEqual({ type: "rewrite", pathname: COMING_SOON_PATH })
  })
})

describe("Links der Warteliste", () => {
  it("Bestätigungslink: zufällig, nur der Abdruck wird gespeichert", () => {
    const a = createConfirmToken()
    const b = createConfirmToken()
    expect(a.token).not.toBe(b.token)
    expect(plausibleConfirmToken(a.token)).toBe(true)
    expect(a.hash).toBe(hashConfirmToken(a.token))
    expect(a.hash).not.toContain(a.token)
    expect(plausibleConfirmToken("../etc")).toBe(false)
  })

  it("Austragelink: signiert, nicht fälschbar", () => {
    const id = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b"
    const other = "00000000-0000-4000-8000-000000000000"
    const token = unsubscribeToken(id, "geheim")
    expect(verifyUnsubscribeToken(token, "geheim")).toBe(id)
    expect(verifyUnsubscribeToken(token, "anderer-schluessel")).toBeNull()
    expect(verifyUnsubscribeToken(`${other}.${token.split(".")[1]}`, "geheim")).toBeNull()
    expect(verifyUnsubscribeToken(`${id}.`, "geheim")).toBeNull()
    expect(verifyUnsubscribeToken(42, "geheim")).toBeNull()
  })
})

describe("Migration 037", () => {
  const sql = readFileSync("scripts/037_waitlist.sql", "utf8")

  it("nur der Server hat Zugriff", () => {
    expect(sql).toMatch(/enable row level security/)
    expect(sql).toMatch(/revoke all on table public\.waitlist from anon, authenticated/)
    expect(sql).not.toMatch(/create policy/)
  })
})

describe("Texte der Warteliste", () => {
  const files = [
    "components/waitlist/coming-soon.tsx",
    "components/waitlist/waitlist-form.tsx",
    "components/waitlist/link-action.tsx",
    "lib/email/waitlist.ts",
  ]

  it.each(files)("%s: keine Gedankenstriche, kein Ausrufezeichen im Text, kein „bewert“", (file) => {
    // Nur Zeichenketten und JSX-Text, keine Kommentare und kein Code.
    const src = readFileSync(file, "utf8").replace(/\/\/.*$/gm, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    const strings = [...src.matchAll(/"([^"\n]*)"|`([^`]*)`|>([^<>{}\n]+)</g)].map((m) => m[1] ?? m[2] ?? m[3]).join("\n")
    expect(strings).not.toMatch(/[—–]/)
    expect(strings).not.toMatch(/bewert/i)
    expect(strings.replace(/!=|!\w|!\(|!!/g, "")).not.toMatch(/!/)
  })
})
