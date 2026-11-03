import { beforeEach, describe, expect, it, vi } from "vitest"

import { sendFixedInterviewInvite } from "@/lib/email/scheduling"
import { encryptToken } from "@/lib/scheduling/crypto"
import { GOOGLE_SCOPES, MICROSOFT_SCOPES, authorizeUrl, revokeAccess, type CalendarAccountRow } from "@/lib/scheduling/providers"

const sent: Array<{ html: string; attachments?: { content: string }[] }> = []
vi.mock("@/lib/email/client", async (orig) => ({
  ...(await orig<typeof import("@/lib/email/client")>()),
  sendMail: async (mail: { html: string; attachments?: { content: string }[] }) => {
    sent.push(mail)
    return true
  },
}))

describe("Kalender-Berechtigungen", () => {
  it("Google: nur Verfügbarkeit und Termine in eigenen Kalendern", () => {
    const scopes = GOOGLE_SCOPES.split(" ")
    expect(scopes).toContain("https://www.googleapis.com/auth/calendar.freebusy")
    expect(scopes).toContain("https://www.googleapis.com/auth/calendar.events.owned")
    // Keine breiten Scopes: Sie verlängern das Prüfverfahren bei Google.
    expect(scopes).not.toContain("https://www.googleapis.com/auth/calendar.readonly")
    expect(scopes).not.toContain("https://www.googleapis.com/auth/calendar.events")
    expect(scopes).not.toContain("https://www.googleapis.com/auth/calendar")
  })

  it("Microsoft: User.Read für die Postfach-Adresse, offline_access für den Refresh-Token", () => {
    const scopes = MICROSOFT_SCOPES.split(" ")
    expect(scopes).toEqual(expect.arrayContaining(["offline_access", "User.Read", "Calendars.ReadWrite"]))
  })

  it("baut die Anmelde-Adresse mit Weiterleitung auf www", () => {
    process.env.GOOGLE_CALENDAR_CLIENT_ID = "id.apps.googleusercontent.com"
    const url = new URL(authorizeUrl("google", "https://www.revetly.ai/api/calendar/callback/google", "s"))
    expect(url.searchParams.get("redirect_uri")).toBe("https://www.revetly.ai/api/calendar/callback/google")
    expect(url.searchParams.get("access_type")).toBe("offline")
  })
})

describe("Feste Interview-Einladung", () => {
  beforeEach(() => {
    sent.length = 0
  })

  const base = {
    to: "anna@beispiel.at",
    candidateName: "Anna Berger",
    jobTitle: "Projektleiterin",
    companyName: "Muster Bau GmbH",
    start: new Date("2026-11-12T09:00:00Z"),
    durationMinutes: 60,
    timezone: "Europe/Vienna",
    format: "remote" as const,
  }

  it("mit Videolink: Knopf zum Call, Link im Kalendereintrag, UID der Buchung", async () => {
    await sendFixedInterviewInvite({ ...base, meetingUrl: "https://meet.google.com/abc-defg-hij", bookingId: "b-123" })
    const { html, attachments } = sent[0]
    expect(html).toContain("Zum Videocall")
    expect(html).toContain("https://meet.google.com/abc-defg-hij")
    const ics = Buffer.from(attachments![0].content, "base64").toString("utf8")
    expect(ics).toContain("UID:booking-b-123@revetly.ai")
    expect(ics).toContain("meet.google.com/abc-defg-hij")
    expect(html).toContain("10:00 Uhr")
  })

  it("ohne Videolink: Google-Kalender-Knopf, Format Remote", async () => {
    await sendFixedInterviewInvite(base)
    expect(sent[0].html).toContain("In Google Kalender eintragen")
    expect(sent[0].html).toContain("Remote")
    expect(sent[0].html).not.toContain("Zum Videocall")
  })
})

describe("Verbindung trennen", () => {
  it("widerruft den Google-Zugang mit dem Refresh-Token, Microsoft nicht", async () => {
    process.env.SCHEDULING_TOKEN_KEY = Buffer.alloc(32, 7).toString("base64")
    const calls: Array<{ url: string; body: string }> = []
    const realFetch = globalThis.fetch
    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      calls.push({ url: String(url), body: String(init?.body) })
      return new Response("{}", { status: 200 })
    }) as typeof fetch
    try {
      const account = {
        id: "a", user_id: "u", provider: "google", account_email: "x@y.at",
        access_token: encryptToken("access-1"), refresh_token: encryptToken("refresh-1"),
        token_expires_at: null, calendar_id: "primary", busy_enabled: true, write_enabled: true,
      } as CalendarAccountRow
      expect(await revokeAccess(account)).toBe(true)
      expect(calls[0].url).toBe("https://oauth2.googleapis.com/revoke")
      expect(calls[0].body).toContain("token=refresh-1")
      expect(await revokeAccess({ ...account, provider: "microsoft" })).toBe(false)
      expect(calls).toHaveLength(1)
    } finally {
      globalThis.fetch = realFetch
    }
  })
})
