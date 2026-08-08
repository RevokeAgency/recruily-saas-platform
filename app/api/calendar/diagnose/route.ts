import { createClient as createServer } from "@/lib/supabase/server"
import { decryptToken, encryptToken, encryptionAvailable } from "@/lib/scheduling/crypto"
import { providerConfigured, type Provider } from "@/lib/scheduling/providers"
import { adminClient } from "@/lib/scheduling/store"
import { absoluteUrl, SITE_URL } from "@/lib/site"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Selbsttest der Kalenderanbindung für den eingeloggten Inhaber.
 *
 *   GET /api/calendar/diagnose
 *
 * Prüft alles, was sich OHNE Zustimmung im Browser prüfen lässt.
 *
 * Wichtig zum Verständnis der Ergebnisse: Die beiden Anbieter lassen sich
 * unterschiedlich gut vorab prüfen.
 *
 *  Google  Vollständig prüfbar. Der authorize-Endpunkt verrät über den
 *          Location-Kopf, ob die App existiert und ob die Weiterleitungs-URI
 *          hinterlegt ist. Der token-Endpunkt unterscheidet sauber zwischen
 *          falschen Zugangsdaten (invalid_client) und einem bloß erfundenen
 *          Token (invalid_grant). „invalid_grant" ist hier das gute Ergebnis.
 *
 *  Micro-  Nicht vorab prüfbar. Der token-Endpunkt prüft zuerst das Format des
 *  soft    Codes und antwortet auch bei frei erfundener Client-ID mit
 *          AADSTS9002313, der authorize-Endpunkt liefert selbst für eine nicht
 *          existierende App die normale Anmeldeseite. Microsoft beurteilt die
 *          App erst nach der Anmeldung eines echten Benutzers. Deshalb bleibt
 *          es dort bei Formatprüfungen, der echte Test ist der Klick auf
 *          „Microsoft 365 verbinden".
 *
 * Beides ist am 8.8.2026 gegen die echten Endpunkte gemessen worden, nicht
 * aus der Dokumentation abgeschrieben.
 */

interface Check {
  name: string
  ok: boolean
  detail: string
  hint?: string
  /** false = nur Formatprüfung, keine Bestätigung durch den Anbieter. */
  verifiziert?: boolean
}

/** Google verrät den Grund base64-kodiert im authError-Parameter. */
function decodeGoogleAuthError(location: string): string | null {
  try {
    const raw = new URL(location).searchParams.get("authError")
    if (!raw) return null
    const bytes = Buffer.from(raw, "base64url")
    // Protobuf-Rahmen: die lesbaren Textstücke herausziehen reicht hier.
    const readable = bytes.toString("latin1").match(/[ -~]{4,}/g) ?? []
    return readable.join(" · ") || null
  } catch {
    return null
  }
}

/** Existiert die Google-App und ist unsere Weiterleitungs-URI hinterlegt? */
async function probeGoogleAuthorize(redirectUri: string): Promise<Check> {
  const name = "Google: App und Weiterleitungs-URI"
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid",
    state: "diagnose",
  })

  try {
    const res = await fetch(`https://accounts.google.com/o/oauth2/v2/auth?${params}`, {
      redirect: "manual",
    })
    const location = res.headers.get("location") ?? ""

    // Weiterleitung auf die Fehlerseite = Google lehnt ab.
    if (location.includes("/signin/oauth/error")) {
      const reason = decodeGoogleAuthError(location) ?? "unbekannter Grund"
      const mismatch = reason.includes("redirect_uri_mismatch")
      return {
        name,
        ok: false,
        verifiziert: true,
        detail: reason.slice(0, 200),
        hint: mismatch
          ? `Diese URI ist bei Google nicht hinterlegt. In der Cloud Console unter „Autorisierte Weiterleitungs-URIs" exakt eintragen: ${redirectUri}`
          : "GOOGLE_CALENDAR_CLIENT_ID prüfen. Die ID endet auf .apps.googleusercontent.com.",
      }
    }

    return {
      name,
      ok: true,
      verifiziert: true,
      detail: "App gefunden, Weiterleitungs-URI ist hinterlegt",
    }
  } catch (err) {
    return {
      name,
      ok: false,
      detail: `Google nicht erreichbar: ${err instanceof Error ? err.message : String(err)}`.slice(0, 200),
    }
  }
}

/** Stimmt das Google-Client-Secret? */
async function probeGoogleSecret(): Promise<Check> {
  const name = "Google: Client-Secret"
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET ?? "",
        grant_type: "refresh_token",
        // Absichtlich ungültig: Es geht nur darum, wie Google die App beurteilt.
        refresh_token: "revetly-diagnose-kein-echter-token",
      }),
    })
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
    const code = String(json.error ?? "")

    if (code === "invalid_grant") {
      return { name, ok: true, verifiziert: true, detail: "Secret wird von Google akzeptiert" }
    }
    if (code === "invalid_client") {
      return {
        name,
        ok: false,
        verifiziert: true,
        detail: "Google lehnt die Kombination aus Client-ID und Secret ab",
        hint: "GOOGLE_CALENDAR_CLIENT_SECRET prüfen (beginnt üblicherweise mit GOCSPX-).",
      }
    }
    return {
      name,
      ok: false,
      detail: `Unerwartete Antwort ${res.status}: ${code} ${String(json.error_description ?? "")}`.trim().slice(0, 200),
    }
  } catch (err) {
    return {
      name,
      ok: false,
      detail: `Google nicht erreichbar: ${err instanceof Error ? err.message : String(err)}`.slice(0, 200),
    }
  }
}

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Microsoft lässt sich nicht vorab bestätigen (siehe Kopfkommentar), deshalb
 * nur Formatprüfungen. Die eine, die sich wirklich lohnt: Wer in Entra ID die
 * Spalte „Geheimnis-ID" statt „Wert" kopiert, bekommt eine GUID. Das ist der
 * mit Abstand häufigste Fehler bei dieser Einrichtung.
 */
function checkMicrosoftFormat(): Check[] {
  const id = process.env.MICROSOFT_CALENDAR_CLIENT_ID ?? ""
  const secret = process.env.MICROSOFT_CALENDAR_CLIENT_SECRET ?? ""
  const tenant = process.env.MICROSOFT_CALENDAR_TENANT || "common"
  const checks: Check[] = []

  checks.push({
    name: "Microsoft: Client-ID",
    ok: GUID.test(id),
    verifiziert: false,
    detail: GUID.test(id)
      ? `Format stimmt (${id.slice(0, 8)}…), Mandant "${tenant}"`
      : id
        ? "Sieht nicht wie eine GUID aus"
        : "Fehlt",
    hint: GUID.test(id)
      ? undefined
      : "In Entra ID die Anwendungs-ID (Client) der App-Registrierung verwenden.",
  })

  checks.push({
    name: "Microsoft: Client-Secret",
    ok: secret.length > 0 && !GUID.test(secret),
    verifiziert: false,
    detail: !secret
      ? "Fehlt"
      : GUID.test(secret)
        ? "Das ist eine GUID und damit vermutlich die Geheimnis-ID statt des Werts"
        : `Format plausibel (${secret.length} Zeichen)`,
    hint: GUID.test(secret)
      ? "In Entra ID unter Zertifikate und Geheimnisse die Spalte Wert kopieren, nicht Geheimnis-ID. Der Wert ist nur direkt nach dem Erzeugen sichtbar."
      : undefined,
  })

  return checks
}

export async function GET() {
  const supabase = await createServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })

  const checks: Check[] = []

  // ── Verschlüsselung ───────────────────────────────────────────────────────
  if (!encryptionAvailable()) {
    checks.push({
      name: "SCHEDULING_TOKEN_KEY",
      ok: false,
      detail: process.env.SCHEDULING_TOKEN_KEY
        ? "Vorhanden, aber keine 32 Byte nach base64-Dekodierung"
        : "Fehlt",
      hint: "Erzeugen mit: openssl rand -base64 32",
    })
  } else {
    let roundTrip = false
    try {
      roundTrip = decryptToken(encryptToken("probe")) === "probe"
    } catch {
      roundTrip = false
    }
    checks.push({
      name: "SCHEDULING_TOKEN_KEY",
      ok: roundTrip,
      detail: roundTrip
        ? "Gesetzt, Ver- und Entschlüsselung funktioniert"
        : "Gesetzt, aber der Rundlauf schlägt fehl",
    })
  }

  // ── Weiterleitungs-URIs ───────────────────────────────────────────────────
  // Häufigste Fehlerquelle überhaupt: Die URI muss beim Anbieter zeichengenau
  // so hinterlegt sein, wie sie hier steht.
  const usingFallback = !process.env.NEXT_PUBLIC_SITE_URL
  checks.push({
    name: "Basis-URL",
    ok: !usingFallback,
    detail: usingFallback
      ? `NEXT_PUBLIC_SITE_URL nicht gesetzt, Revetly rechnet mit ${SITE_URL}`
      : `NEXT_PUBLIC_SITE_URL = ${SITE_URL}`,
    hint: usingFallback
      ? "Solange die App unter einer anderen Domain läuft, passen die Weiterleitungs-URIs nicht und der Anbieter meldet redirect_uri_mismatch."
      : undefined,
  })

  const redirectUris = {
    google: absoluteUrl("/api/calendar/callback/google"),
    microsoft: absoluteUrl("/api/calendar/callback/microsoft"),
  }

  // ── Google: echte Prüfung beim Anbieter ───────────────────────────────────
  if (!providerConfigured("google")) {
    checks.push({
      name: "Google: Zugangsdaten",
      ok: false,
      detail: "GOOGLE_CALENDAR_CLIENT_ID oder GOOGLE_CALENDAR_CLIENT_SECRET fehlt",
    })
  } else {
    const [authorize, secret] = await Promise.all([
      probeGoogleAuthorize(redirectUris.google),
      probeGoogleSecret(),
    ])
    checks.push(authorize, secret)
  }

  // ── Microsoft: nur Formatprüfung, siehe Kopfkommentar ─────────────────────
  if (!providerConfigured("microsoft")) {
    checks.push({
      name: "Microsoft: Zugangsdaten",
      ok: false,
      detail: "MICROSOFT_CALENDAR_CLIENT_ID oder MICROSOFT_CALENDAR_CLIENT_SECRET fehlt",
    })
  } else {
    checks.push(...checkMicrosoftFormat())
  }

  // ── Bereits verbundene Konten ─────────────────────────────────────────────
  let accounts: {
    provider: string
    email: string | null
    tokenLesbar: boolean
    abgelaufen: boolean | null
    erneuerbar: boolean
    letzterFehler: string | null
  }[] = []

  try {
    const { data } = await adminClient()
      .from("calendar_accounts")
      .select("provider, account_email, access_token, refresh_token, token_expires_at, last_error")
      .eq("user_id", user.id)

    accounts = (data ?? []).map((a) => {
      let tokenLesbar = false
      try {
        tokenLesbar = decryptToken(a.access_token as string).length > 0
      } catch {
        tokenLesbar = false
      }
      return {
        provider: a.provider as string,
        email: (a.account_email as string) ?? null,
        tokenLesbar,
        abgelaufen: a.token_expires_at ? new Date(a.token_expires_at as string) < new Date() : null,
        erneuerbar: Boolean(a.refresh_token),
        letzterFehler: (a.last_error as string) ?? null,
      }
    })
  } catch {
    checks.push({
      name: "Datenbank",
      ok: false,
      detail: "Tabelle calendar_accounts nicht lesbar",
      hint: "scripts/025_scheduling.sql in Supabase ausführen.",
    })
  }

  const bereit = checks.every((c) => c.ok)

  return Response.json(
    {
      bereit,
      zusammenfassung: bereit
        ? "Alles Prüfbare stimmt. Jetzt oben auf verbinden klicken, das ist der eigentliche Test."
        : "Es fehlt noch etwas, siehe pruefungen.",
      hinweisMicrosoft:
        "Microsoft beurteilt die App erst nach der Anmeldung eines echten Benutzers. " +
        "Vorab lässt sich dort nur das Format prüfen. Bei Google ist die Prüfung vollständig.",
      pruefungen: checks,
      weiterleitungsUris: {
        hinweis:
          "Diese beiden URIs müssen beim Anbieter zeichengenau hinterlegt sein. Kein Schrägstrich am Ende.",
        ...redirectUris,
      },
      verbundeneKonten: accounts,
    },
    { status: 200 },
  )
}
