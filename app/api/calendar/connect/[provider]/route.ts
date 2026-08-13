import { NextRequest } from "next/server"

import { createClient as createServer } from "@/lib/supabase/server"
import { encryptionAvailable, signOAuthState } from "@/lib/scheduling/crypto"
import { authorizeUrl, providerConfigured, type Provider } from "@/lib/scheduling/providers"
import { absoluteUrl } from "@/lib/site"

export const dynamic = "force-dynamic"

function isProvider(value: string): value is Provider {
  return value === "google" || value === "microsoft"
}

export function callbackUrl(provider: Provider): string {
  return absoluteUrl(`/api/calendar/callback/${provider}`)
}

/**
 * Nur seiteneigene Pfade als Rückkehrziel zulassen. Ohne diese Prüfung wäre
 * der Endpunkt eine offene Weiterleitung: Ein Angreifer könnte einen
 * Revetly-Link bauen, der am Ende auf seiner eigenen Seite landet.
 * Protokollrelative Pfade („//boese.example") zählen ausdrücklich nicht.
 */
function safeReturnPath(value: string | null): string | null {
  if (!value) return null
  if (!value.startsWith("/") || value.startsWith("//")) return null
  if (value.includes("\\")) return null
  return value.slice(0, 300)
}

/**
 * Startet die Kalenderanbindung. Leitet zum Anbieter weiter und trägt die
 * Nutzer-Kennung signiert im state-Parameter mit, damit der Rückruf sie nicht
 * erraten oder untergeschoben bekommen kann.
 *
 * Zwei Betriebsarten:
 *   ?popup=1        Der Rückruf schließt das Fenster und meldet sich beim
 *                   Öffner. Damit bleibt ein offener Dialog offen.
 *   ?weiter=/pfad   Rückkehrziel für den Fall ohne Popup (Blocker, Handy).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params
  if (!isProvider(provider)) {
    return Response.redirect(absoluteUrl("/termine?fehler=unbekannter-anbieter"), 302)
  }

  const url = new URL(req.url)
  const popup = url.searchParams.get("popup") === "1"
  const weiter = safeReturnPath(url.searchParams.get("weiter"))

  const supabase = await createServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.redirect(absoluteUrl("/auth/register"), 302)

  if (!encryptionAvailable()) {
    return Response.redirect(absoluteUrl("/termine?fehler=kein-schluessel"), 302)
  }
  if (!providerConfigured(provider)) {
    return Response.redirect(absoluteUrl("/termine?fehler=nicht-eingerichtet"), 302)
  }

  const state = signOAuthState({
    uid: user.id,
    provider,
    ...(popup ? { popup: "1" } : {}),
    ...(weiter ? { weiter } : {}),
  })
  return Response.redirect(authorizeUrl(provider, callbackUrl(provider), state), 302)
}
