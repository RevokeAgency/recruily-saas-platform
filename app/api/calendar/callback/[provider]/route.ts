import { NextRequest } from "next/server"

import { encryptToken, verifyOAuthState } from "@/lib/scheduling/crypto"
import {
  exchangeCode,
  fetchAccountEmail,
  type Provider,
} from "@/lib/scheduling/providers"
import { adminClient } from "@/lib/scheduling/store"
import { absoluteUrl } from "@/lib/site"

export const dynamic = "force-dynamic"

function isProvider(value: string): value is Provider {
  return value === "google" || value === "microsoft"
}

function back(query: string, weiter?: string | null): Response {
  const ziel = weiter && weiter.startsWith("/") && !weiter.startsWith("//") ? weiter : "/termine"
  const trenner = ziel.includes("?") ? "&" : "?"
  return Response.redirect(absoluteUrl(`${ziel}${trenner}${query.replace(/^\?/, "")}`), 302)
}

/**
 * Antwort für den Popup-Fall: meldet das Ergebnis an das öffnende Fenster und
 * schließt sich selbst. Dadurch bleibt ein offener Dialog stehen, statt dass
 * der Kunde nach dem Verbinden auf einer anderen Seite landet.
 *
 * Die Nachricht geht ausdrücklich nur an die eigene Herkunft, nicht an "*":
 * Sonst könnte jede fremde Seite, die dieses Fenster geöffnet hat, mitlesen.
 */
function closePopup(ok: boolean, fehler?: string): Response {
  const payload = JSON.stringify({ typ: "revetly-kalender", ok, fehler: fehler ?? null })
  const origin = JSON.stringify(new URL(absoluteUrl("/")).origin)

  const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><title>Kalender verbunden</title>
<style>
  body { font-family: system-ui, sans-serif; display: grid; place-items: center;
         min-height: 100vh; margin: 0; color: #0C1A16; background: #F4F7F6; }
  p { font-size: 14px; }
</style></head>
<body>
<p>${ok ? "Kalender verbunden. Dieses Fenster schließt sich." : "Verbindung fehlgeschlagen. Dieses Fenster schließt sich."}</p>
<script>
  try { window.opener && window.opener.postMessage(${payload}, ${origin}) } catch (e) {}
  setTimeout(function () { window.close() }, ${ok ? 600 : 2500})
</script>
</body></html>`

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  })
}

/**
 * Rückruf des Anbieters. Tauscht den Code gegen Tokens, speichert sie
 * verschlüsselt und schickt den Kunden zurück in die Terminverwaltung.
 *
 * Die Nutzer-Kennung stammt ausschließlich aus dem signierten state. Der
 * Sitzungscookie wird bewusst nicht als Quelle genutzt: Bei einem
 * untergeschobenen Rückruf würde sonst das Kalenderkonto eines Angreifers am
 * Konto des Opfers landen.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params
  if (!isProvider(provider)) return back("?fehler=unbekannter-anbieter")

  const url = new URL(req.url)
  const state = url.searchParams.get("state")
  // Der state wird zuerst gelesen, weil erst er verrät, ob die Antwort in ein
  // Popup gehört. Vertraut wird ihm aber nur nach geprüfter Signatur.
  const payload = state ? verifyOAuthState(state) : null
  const istPopup = payload?.popup === "1"
  const weiter = payload?.weiter ?? null

  /** Antwortet je nach Betriebsart als Popup-Schluss oder als Weiterleitung. */
  const antwort = (ok: boolean, fehler?: string) =>
    istPopup ? closePopup(ok, fehler) : back(ok ? "?verbunden=1" : `?fehler=${encodeURIComponent(fehler ?? "oauth")}`, weiter)

  const error = url.searchParams.get("error")
  if (error) return antwort(false, error)

  const code = url.searchParams.get("code")
  if (!code || !state) return antwort(false, "unvollstaendig")
  if (!payload?.uid || payload.provider !== provider) return antwort(false, "state-ungueltig")

  try {
    const tokens = await exchangeCode(provider, code, absoluteUrl(`/api/calendar/callback/${provider}`))
    const accountEmail = await fetchAccountEmail(provider, tokens.accessToken)

    const db = adminClient()
    const row = {
      user_id: payload.uid,
      provider,
      account_email: accountEmail,
      access_token: encryptToken(tokens.accessToken),
      refresh_token: tokens.refreshToken ? encryptToken(tokens.refreshToken) : null,
      token_expires_at: tokens.expiresAt ? tokens.expiresAt.toISOString() : null,
      scope: tokens.scope ?? null,
      calendar_id: "primary",
      last_error: null,
      last_error_at: null,
    }

    // Verbindet jemand dasselbe Konto erneut, werden die Tokens ersetzt statt
    // ein zweiter Eintrag angelegt.
    const { error: upsertError } = await db
      .from("calendar_accounts")
      .upsert(row, { onConflict: "user_id,provider,account_email" })

    if (upsertError) {
      console.error("[calendar] Speichern fehlgeschlagen:", upsertError)
      return antwort(false, "speichern")
    }

    return antwort(true)
  } catch (err) {
    console.error("[calendar] OAuth-Rückruf fehlgeschlagen:", err)
    return antwort(false, "oauth")
  }
}
