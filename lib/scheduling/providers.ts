import { randomUUID } from "node:crypto"

import { decryptToken, encryptToken } from "./crypto"
import type { BusyInterval, LocationKind } from "./types"

// Anbindung an Google Calendar und Microsoft Graph.
//
// Absichtlich ohne SDK: Beide Anbieter liefern hier genau drei Dinge, und für
// drei REST-Aufrufe lohnt sich weder ein Abhängigkeitsbaum noch dessen
// Pflege. Gebraucht werden Token erneuern, Belegtzeiten lesen, Termin
// schreiben und löschen.
//
// Belegtzeiten werden live abgefragt statt gespiegelt. Damit liegen bei uns
// keine fremden Kalenderinhalte, und es gibt keinen veralteten Stand.

export type Provider = "google" | "microsoft"

export interface OAuthTokens {
  accessToken: string
  refreshToken?: string | null
  expiresAt: Date | null
  scope?: string | null
}

export interface CalendarAccountRow {
  id: string
  user_id: string
  provider: Provider
  account_email: string | null
  access_token: string
  refresh_token: string | null
  token_expires_at: string | null
  calendar_id: string
  busy_enabled: boolean
  write_enabled: boolean
  last_error?: string | null
  last_error_at?: string | null
}

export interface CreatedEvent {
  eventId: string
  meetingUrl: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Konfiguration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Google braucht calendar.events zum Schreiben und calendar.readonly für die
 * Belegtzeiten. Meet-Links entstehen über conferenceData beim Anlegen des
 * Termins, dafür ist kein weiterer Scope nötig.
 */
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
  "openid",
  "email",
].join(" ")

/**
 * offline_access hält den Refresh-Token am Leben, sonst wäre nach einer Stunde
 * Schluss und der Kunde müsste ständig neu verbinden.
 */
export const MICROSOFT_SCOPES = [
  "offline_access",
  "openid",
  "email",
  "Calendars.ReadWrite",
].join(" ")

export function providerConfigured(provider: Provider): boolean {
  return provider === "google"
    ? Boolean(process.env.GOOGLE_CALENDAR_CLIENT_ID && process.env.GOOGLE_CALENDAR_CLIENT_SECRET)
    : Boolean(process.env.MICROSOFT_CALENDAR_CLIENT_ID && process.env.MICROSOFT_CALENDAR_CLIENT_SECRET)
}

function clientId(provider: Provider): string {
  const id =
    provider === "google"
      ? process.env.GOOGLE_CALENDAR_CLIENT_ID
      : process.env.MICROSOFT_CALENDAR_CLIENT_ID
  if (!id) throw new Error(`Kein Client-ID für ${provider} hinterlegt.`)
  return id
}

function clientSecret(provider: Provider): string {
  const secret =
    provider === "google"
      ? process.env.GOOGLE_CALENDAR_CLIENT_SECRET
      : process.env.MICROSOFT_CALENDAR_CLIENT_SECRET
  if (!secret) throw new Error(`Kein Client-Secret für ${provider} hinterlegt.`)
  return secret
}

/** Der Mandant, gegen den Microsoft anmeldet. 'common' erlaubt jede Organisation. */
function microsoftTenant(): string {
  return process.env.MICROSOFT_CALENDAR_TENANT || "common"
}

export function authorizeUrl(provider: Provider, redirectUri: string, state: string): string {
  if (provider === "google") {
    const params = new URLSearchParams({
      client_id: clientId("google"),
      redirect_uri: redirectUri,
      response_type: "code",
      scope: GOOGLE_SCOPES,
      // Ohne beides liefert Google beim zweiten Verbinden keinen Refresh-Token
      // mehr, und die Verbindung stirbt nach einer Stunde.
      access_type: "offline",
      prompt: "consent",
      state,
    })
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }

  const params = new URLSearchParams({
    client_id: clientId("microsoft"),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: MICROSOFT_SCOPES,
    response_mode: "query",
    state,
  })
  return `https://login.microsoftonline.com/${microsoftTenant()}/oauth2/v2.0/authorize?${params}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Token-Austausch
// ─────────────────────────────────────────────────────────────────────────────

function tokenEndpoint(provider: Provider): string {
  return provider === "google"
    ? "https://oauth2.googleapis.com/token"
    : `https://login.microsoftonline.com/${microsoftTenant()}/oauth2/v2.0/token`
}

async function postForm(url: string, body: Record<string, string>): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  })
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    throw new Error(
      `${url} antwortete ${res.status}: ${String(json.error_description || json.error || "unbekannt")}`,
    )
  }
  return json
}

export async function exchangeCode(
  provider: Provider,
  code: string,
  redirectUri: string,
): Promise<OAuthTokens> {
  const json = await postForm(tokenEndpoint(provider), {
    client_id: clientId(provider),
    client_secret: clientSecret(provider),
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  })

  return {
    accessToken: String(json.access_token),
    refreshToken: json.refresh_token ? String(json.refresh_token) : null,
    expiresAt: json.expires_in ? new Date(Date.now() + Number(json.expires_in) * 1000) : null,
    scope: json.scope ? String(json.scope) : null,
  }
}

async function refresh(provider: Provider, refreshToken: string): Promise<OAuthTokens> {
  const json = await postForm(tokenEndpoint(provider), {
    client_id: clientId(provider),
    client_secret: clientSecret(provider),
    refresh_token: refreshToken,
    grant_type: "refresh_token",
    ...(provider === "microsoft" ? { scope: MICROSOFT_SCOPES } : {}),
  })

  return {
    accessToken: String(json.access_token),
    // Google schickt beim Erneuern keinen neuen Refresh-Token mit, Microsoft
    // rotiert ihn. Deshalb hier den alten behalten, wenn keiner kommt.
    refreshToken: json.refresh_token ? String(json.refresh_token) : refreshToken,
    expiresAt: json.expires_in ? new Date(Date.now() + Number(json.expires_in) * 1000) : null,
    scope: json.scope ? String(json.scope) : null,
  }
}

/** E-Mail-Adresse des verbundenen Kontos, für die Anzeige in den Einstellungen. */
export async function fetchAccountEmail(provider: Provider, accessToken: string): Promise<string | null> {
  try {
    const url =
      provider === "google"
        ? "https://www.googleapis.com/oauth2/v2/userinfo"
        : "https://graph.microsoft.com/v1.0/me"
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!res.ok) return null
    const json = (await res.json()) as Record<string, unknown>
    return String(json.email || json.mail || json.userPrincipalName || "") || null
  } catch {
    return null
  }
}

/**
 * Liefert einen gültigen Zugang. Erneuert bei Bedarf und meldet über
 * `updated` zurück, dass der Aufrufer den neuen Stand speichern soll.
 */
export async function validAccessToken(
  account: CalendarAccountRow,
): Promise<{ accessToken: string; updated: { access_token: string; refresh_token: string | null; token_expires_at: string | null } | null }> {
  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at) : null
  // Eine Minute Sicherheitsabstand: Ein Token, das während des Aufrufs
  // abläuft, kostet sonst einen Fehlversuch.
  const stillValid = expiresAt ? expiresAt.getTime() - 60_000 > Date.now() : false

  if (stillValid) {
    return { accessToken: decryptToken(account.access_token), updated: null }
  }

  if (!account.refresh_token) {
    // Kein Erneuern möglich. Der alte Token wird noch versucht; scheitert er,
    // meldet der Aufrufer die Verbindung als abgelaufen.
    return { accessToken: decryptToken(account.access_token), updated: null }
  }

  const fresh = await refresh(account.provider, decryptToken(account.refresh_token))
  return {
    accessToken: fresh.accessToken,
    updated: {
      access_token: encryptToken(fresh.accessToken),
      refresh_token: fresh.refreshToken ? encryptToken(fresh.refreshToken) : account.refresh_token,
      token_expires_at: fresh.expiresAt ? fresh.expiresAt.toISOString() : null,
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Belegtzeiten
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchBusy(
  account: CalendarAccountRow,
  accessToken: string,
  from: Date,
  to: Date,
  timeZone: string,
): Promise<BusyInterval[]> {
  if (account.provider === "google") {
    const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        timeMin: from.toISOString(),
        timeMax: to.toISOString(),
        timeZone,
        items: [{ id: account.calendar_id || "primary" }],
      }),
    })
    if (!res.ok) throw new Error(`Google freeBusy: ${res.status} ${await res.text()}`)

    const json = (await res.json()) as {
      calendars?: Record<string, { busy?: { start: string; end: string }[] }>
    }
    const out: BusyInterval[] = []
    for (const cal of Object.values(json.calendars ?? {})) {
      for (const b of cal.busy ?? []) out.push({ start: new Date(b.start), end: new Date(b.end) })
    }
    return out
  }

  // Microsoft getSchedule erwartet die Postfach-Adresse, nicht die Kalender-ID.
  const address = account.account_email
  if (!address) return []

  const res = await fetch("https://graph.microsoft.com/v1.0/me/calendar/getSchedule", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      schedules: [address],
      startTime: { dateTime: from.toISOString().slice(0, 19), timeZone: "UTC" },
      endTime: { dateTime: to.toISOString().slice(0, 19), timeZone: "UTC" },
      availabilityViewInterval: 15,
    }),
  })
  if (!res.ok) throw new Error(`Microsoft getSchedule: ${res.status} ${await res.text()}`)

  const json = (await res.json()) as {
    value?: {
      scheduleItems?: { status?: string; start: { dateTime: string; timeZone?: string }; end: { dateTime: string; timeZone?: string } }[]
    }[]
  }

  const out: BusyInterval[] = []
  for (const schedule of json.value ?? []) {
    for (const item of schedule.scheduleItems ?? []) {
      // 'free' und 'workingElsewhere' blockieren keinen Termin.
      if (item.status === "free" || item.status === "workingElsewhere") continue
      out.push({
        start: new Date(`${item.start.dateTime}Z`),
        end: new Date(`${item.end.dateTime}Z`),
      })
    }
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// Termine schreiben
// ─────────────────────────────────────────────────────────────────────────────

export interface EventDraft {
  summary: string
  description: string
  start: Date
  end: Date
  timeZone: string
  attendeeEmail?: string | null
  attendeeName?: string | null
  locationKind: LocationKind
  locationValue?: string | null
}

export async function createEvent(
  account: CalendarAccountRow,
  accessToken: string,
  draft: EventDraft,
): Promise<CreatedEvent> {
  const wantsConference = draft.locationKind === "video_auto"

  if (account.provider === "google") {
    const params = new URLSearchParams({ sendUpdates: "none" })
    if (wantsConference) params.set("conferenceDataVersion", "1")

    const body: Record<string, unknown> = {
      summary: draft.summary,
      description: draft.description,
      start: { dateTime: draft.start.toISOString(), timeZone: draft.timeZone },
      end: { dateTime: draft.end.toISOString(), timeZone: draft.timeZone },
    }
    if (draft.attendeeEmail) {
      body.attendees = [{ email: draft.attendeeEmail, displayName: draft.attendeeName ?? undefined }]
    }
    if (draft.locationKind === "onsite" && draft.locationValue) body.location = draft.locationValue
    if (draft.locationKind === "custom_link" && draft.locationValue) body.location = draft.locationValue
    if (wantsConference) {
      body.conferenceData = {
        createRequest: {
          requestId: randomUUID(),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      }
    }

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(account.calendar_id || "primary")}/events?${params}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    )
    if (!res.ok) throw new Error(`Google events.insert: ${res.status} ${await res.text()}`)

    const json = (await res.json()) as { id: string; hangoutLink?: string; conferenceData?: { entryPoints?: { uri?: string; entryPointType?: string }[] } }
    const meet =
      json.hangoutLink ||
      json.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ||
      null
    return { eventId: json.id, meetingUrl: meet }
  }

  // Microsoft: onlineMeeting entsteht über isOnlineMeeting + Provider.
  const body: Record<string, unknown> = {
    subject: draft.summary,
    body: { contentType: "HTML", content: draft.description.replace(/\n/g, "<br>") },
    start: { dateTime: draft.start.toISOString().slice(0, 23), timeZone: "UTC" },
    end: { dateTime: draft.end.toISOString().slice(0, 23), timeZone: "UTC" },
  }
  if (draft.attendeeEmail) {
    body.attendees = [
      {
        emailAddress: { address: draft.attendeeEmail, name: draft.attendeeName ?? draft.attendeeEmail },
        type: "required",
      },
    ]
  }
  if (wantsConference) {
    body.isOnlineMeeting = true
    body.onlineMeetingProvider = "teamsForBusiness"
  }
  if ((draft.locationKind === "onsite" || draft.locationKind === "custom_link") && draft.locationValue) {
    body.location = { displayName: draft.locationValue }
  }

  const res = await fetch("https://graph.microsoft.com/v1.0/me/events", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Microsoft events.create: ${res.status} ${await res.text()}`)

  const json = (await res.json()) as { id: string; onlineMeeting?: { joinUrl?: string } }
  return { eventId: json.id, meetingUrl: json.onlineMeeting?.joinUrl ?? null }
}

export async function deleteEvent(
  account: CalendarAccountRow,
  accessToken: string,
  eventId: string,
): Promise<void> {
  const url =
    account.provider === "google"
      ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(account.calendar_id || "primary")}/events/${encodeURIComponent(eventId)}`
      : `https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(eventId)}`

  const res = await fetch(url, { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } })
  // 404/410 heißt: schon weg. Das ist kein Fehler.
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`${account.provider} events.delete: ${res.status}`)
  }
}
