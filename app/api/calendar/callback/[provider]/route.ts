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

function back(query: string): Response {
  return Response.redirect(absoluteUrl(`/termine${query}`), 302)
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
  const error = url.searchParams.get("error")
  if (error) return back(`?fehler=${encodeURIComponent(error)}`)

  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  if (!code || !state) return back("?fehler=unvollstaendig")

  const payload = verifyOAuthState(state)
  if (!payload?.uid || payload.provider !== provider) return back("?fehler=state-ungueltig")

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
      return back("?fehler=speichern")
    }

    return back("?verbunden=1")
  } catch (err) {
    console.error("[calendar] OAuth-Rückruf fehlgeschlagen:", err)
    return back("?fehler=oauth")
  }
}
