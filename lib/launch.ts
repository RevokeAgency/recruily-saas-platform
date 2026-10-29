// ─────────────────────────────────────────────────────────────────────────────
// Launch-Schalter (Warteliste vor dem Start).
//
// NEXT_PUBLIC_LAUNCH_MODE=waitlist:
//   - "/" zeigt die Coming-Soon-Seite mit Warteliste (app/coming-soon), die
//     Landing bleibt unter derselben Adresse für alle mit Vorschau-Cookie.
//   - Die öffentliche Registrierung ist zu. Login, App, Team-Einladungen,
//     Blog, Rechtstexte und Stellenseiten laufen normal.
//   - Vorschau: einmal /?vorschau=<LAUNCH_PREVIEW_TOKEN> aufrufen, das setzt
//     ein Cookie für 30 Tage. /?vorschau=aus löscht es wieder.
// Ohne die Variable (oder mit "live") läuft alles wie gewohnt.
//
// NEXT_PUBLIC_, weil auch statische Seiten (Blog) ihren Knopf danach wählen.
// Eine Änderung wirkt deshalb erst mit dem nächsten Deployment.
// ─────────────────────────────────────────────────────────────────────────────

export type LaunchMode = "live" | "waitlist"

export const PREVIEW_COOKIE = "rv_vorschau"
export const PREVIEW_PARAM = "vorschau"
export const PREVIEW_MAX_AGE = 60 * 60 * 24 * 30

/** Interner Pfad der Coming-Soon-Seite. Von außen nur unter "/" erreichbar. */
export const COMING_SOON_PATH = "/coming-soon"

export function launchMode(value: string | undefined = process.env.NEXT_PUBLIC_LAUNCH_MODE): LaunchMode {
  return value?.trim().toLowerCase() === "waitlist" ? "waitlist" : "live"
}

export function isWaitlistMode(): boolean {
  return launchMode() === "waitlist"
}

/** Vergleich ohne frühen Abbruch, damit die Laufzeit das Token nicht verrät. */
function sameToken(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export type GateDecision =
  | { type: "next"; preview: boolean }
  | { type: "rewrite"; pathname: string }
  | { type: "redirect"; pathname: string; search: string; cookie?: "set" | "clear" }

/**
 * Was die Middleware mit einer Anfrage tut. Reine Funktion, damit sie ohne
 * Next.js testbar ist.
 */
export function launchGate(input: {
  mode: LaunchMode
  pathname: string
  searchParams: URLSearchParams
  previewCookie: string | undefined
  previewToken: string | undefined
}): GateDecision {
  const { mode, pathname, searchParams } = input
  const token = input.previewToken?.trim() || ""

  // Die Coming-Soon-Seite hat keine eigene öffentliche Adresse.
  if (pathname === COMING_SOON_PATH || pathname === `${COMING_SOON_PATH}/`) {
    return { type: "redirect", pathname: "/", search: "" }
  }
  if (mode !== "waitlist") return { type: "next", preview: false }

  const param = searchParams.get(PREVIEW_PARAM)
  if (param !== null) {
    const rest = new URLSearchParams(searchParams)
    rest.delete(PREVIEW_PARAM)
    const search = rest.toString() ? `?${rest.toString()}` : ""
    if (param === "aus") return { type: "redirect", pathname, search, cookie: "clear" }
    if (token && sameToken(param, token)) return { type: "redirect", pathname, search, cookie: "set" }
    return { type: "redirect", pathname, search }
  }

  const preview = !!token && !!input.previewCookie && sameToken(input.previewCookie, token)
  if (preview) return { type: "next", preview: true }

  if (pathname === "/") return { type: "rewrite", pathname: COMING_SOON_PATH }
  if (pathname === "/auth/register" || pathname.startsWith("/auth/register/")) {
    return { type: "redirect", pathname: "/", search: "" }
  }
  return { type: "next", preview: false }
}
