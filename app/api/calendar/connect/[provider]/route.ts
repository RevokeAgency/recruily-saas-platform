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
 * Startet die Kalenderanbindung. Leitet zum Anbieter weiter und trägt die
 * Nutzer-Kennung signiert im state-Parameter mit, damit der Rückruf sie nicht
 * erraten oder untergeschoben bekommen kann.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params
  if (!isProvider(provider)) {
    return Response.redirect(absoluteUrl("/termine?fehler=unbekannter-anbieter"), 302)
  }

  const supabase = await createServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.redirect(absoluteUrl("/auth/register"), 302)

  if (!encryptionAvailable()) {
    return Response.redirect(absoluteUrl("/termine?fehler=kein-schluessel"), 302)
  }
  if (!providerConfigured(provider)) {
    return Response.redirect(absoluteUrl("/termine?fehler=nicht-eingerichtet"), 302)
  }

  const state = signOAuthState({ uid: user.id, provider })
  return Response.redirect(authorizeUrl(provider, callbackUrl(provider), state), 302)
}
