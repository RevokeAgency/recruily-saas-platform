import type { User } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/server"

// ─────────────────────────────────────────────────────────────────────────────
// Zugang zum Admin-Bereich unter /admin.
//
// Genau ein Konto: admin@revetly.ai (ADMIN_EMAIL kann es umstellen). Zusätzlich
// zum Passwort ist ein zweiter Faktor Pflicht: ein Code aus einer
// Authenticator-App (Supabase MFA, TOTP). Erst mit bestätigtem zweitem Faktor
// hat die Sitzung die Stufe aal2, und nur dann gibt es Daten.
// ─────────────────────────────────────────────────────────────────────────────

export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL?.trim() || "admin@revetly.ai").toLowerCase()

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && email.trim().toLowerCase() === ADMIN_EMAIL
}

export type AdminAccess =
  /** Nicht angemeldet. */
  | { state: "anon" }
  /** Angemeldet, aber nicht als Admin. */
  | { state: "forbidden"; email: string | null }
  /** Admin, noch kein zweiter Faktor eingerichtet. */
  | { state: "enroll"; user: User }
  /** Admin mit zweitem Faktor, der für diese Sitzung noch bestätigt werden muss. */
  | { state: "verify"; user: User }
  /** Admin mit bestätigtem zweitem Faktor. */
  | { state: "ok"; user: User }

/** Ordnet aktuelle und mögliche Sicherheitsstufe der Sitzung einem Zustand zu. */
export function accessFromLevels(
  user: User,
  currentLevel: string | null | undefined,
  nextLevel: string | null | undefined,
): AdminAccess {
  if (!isAdminEmail(user.email)) return { state: "forbidden", email: user.email ?? null }
  if (currentLevel === "aal2") return { state: "ok", user }
  if (nextLevel === "aal2") return { state: "verify", user }
  return { state: "enroll", user }
}

export async function getAdminAccess(): Promise<AdminAccess> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { state: "anon" }
  if (!isAdminEmail(user.email)) return { state: "forbidden", email: user.email ?? null }
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (error) return { state: "verify", user }
  return accessFromLevels(user, data?.currentLevel, data?.nextLevel)
}

/** Für API-Routen: die Admin-Adresse bei voller Anmeldung, sonst null. */
export async function adminEmailOrNull(): Promise<string | null> {
  const access = await getAdminAccess()
  return access.state === "ok" ? (access.user.email ?? null) : null
}
